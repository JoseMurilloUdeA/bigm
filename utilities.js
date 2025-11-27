export function renderTableau(tableau, varNames, basicVars, container) {
    container.innerHTML = ""; // limpiar

    const table = document.createElement("table");
    table.border = "1";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "10px";

    // --- encabezado ---
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const emptyCell = document.createElement("th");
    emptyCell.textContent = " ";
    headerRow.appendChild(emptyCell);

    varNames.forEach((v, index) => {
        const th = document.createElement("th");
        th.textContent = v;

        if (basicVars.includes(index)) {
            th.style.background = "#c8ffc8";
        }

        headerRow.appendChild(th);
    });

    const rhs = document.createElement("th");
    rhs.textContent = "RHS";
    headerRow.appendChild(rhs);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // --- cuerpo ---
    const tbody = document.createElement("tbody");

    tableau.forEach((row, i) => {
        const tr = document.createElement("tr");

        const label = document.createElement("td");
        label.textContent = i === 0 ? "Z" : `F${i}`;
        label.style.fontWeight = i === 0 ? "bold" : "normal";
        tr.appendChild(label);

        row.forEach(value => {
            const td = document.createElement("td");
            td.textContent = Number(value).toFixed(2);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

export function renderIteration(iter, entering, leaving, tableau, varNames, basicVars) {
    const container = document.getElementById("simplex-iterations");

    const block = document.createElement("div");
    block.style.border = "1px solid #ccc";
    block.style.padding = "12px";
    block.style.margin = "10px 0";
    block.style.borderRadius = "6px";
    block.style.background = "#fafafa";

    const title = document.createElement("h3");
    title.textContent = `Iteración ${iter}`;
    block.appendChild(title);

    if (entering !== null && leaving !== null) {
        const info = document.createElement("p");
        info.innerHTML = `
            ➡ Entra: <strong>${entering}</strong>  
            &nbsp;&nbsp; ⬅ Sale: <strong>${leaving}</strong>
        `;
        block.appendChild(info);
    }

    // Crear contenedor de tabla
    const subContainer = document.createElement("div");
    block.appendChild(subContainer);

    // Renderizar tableau AQUÍ
    renderTableau(tableau, varNames, basicVars, subContainer);

    container.appendChild(block);
}

export function plotProblemAndSolution(A, b, senses, sol, history) {

    if (A[0].length !== 2) {
        alert("⚠ Gráfica solo disponible para 2 variables.");
        document.getElementById("title-plot-region").style = "display: none";
        document.getElementById("plot-region").visibility = "display: none";
        return;
    }

    const ctx = document.getElementById("plot-region").getContext("2d");

    // Crear datos de líneas de restricción
    let datasets = [];

    const x1 = [];
    for (let i = 0; i <= 200; i++) x1.push(i * 0.1);

    A.forEach((row, i) => {
        const a1 = row[0];
        const a2 = row[1];
        const rhs = b[i];
        let yPoints = [];

        if (a2 !== 0) {
            yPoints = x1.map(x => (rhs - a1 * x) / a2);
        } else {
            yPoints = x1.map(() => rhs / a1);
        }

        datasets.push({
            label: `${a1}x₁ + ${a2}x₂ ${senses[i]} ${rhs}`,
            data: x1.map((x, idx) => ({ x, y: yPoints[idx] })),
            parsing: false,
            borderWidth: 2,
            fill: false
        });
    });

    // Recorrido del Simplex
    const simplexPath = history.map(tab => {
        const x = tab[1][tab[0].length - 1];
        const y = tab[2] ? tab[2][tab[0].length - 1] : 0;
        return { x, y };
    });

    datasets.push({
        label: "Recorrido Simplex",
        data: simplexPath,
        parsing: false,
        borderWidth: 2,
        borderColor: "black",
        pointBackgroundColor: "black",
        showLine: true
    });

    // Punto óptimo
    datasets.push({
        label: "Solución óptima",
        data: [{ x: sol[0], y: sol[1] }],
        parsing: false,
        pointStyle: "star",
        pointRadius: 10,
        borderColor: "red",
        backgroundColor: "red",
        showLine: false
    });

    new Chart(ctx, {
        type: "scatter",
        data: { datasets },
        options: {
            scales: {
                x: { title: { display: true, text: "x1" } },
                y: { title: { display: true, text: "x2" } }
            }
        }
    });
}

export function plotZConvergence(z_values) {
    const ctx = document.getElementById("plot-z").getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: z_values.map((_, i) => i + 1),
            datasets: [{
                label: "Valor de Z",
                data: z_values,
                borderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: "Iteración" } },
                y: { title: { display: true, text: "Z" } }
            }
        }
    });
}