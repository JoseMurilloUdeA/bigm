/*
Big M Simplex

Características principales
- Permite ingresar el problema mediante una entrada tipo JSON / py-dict vía `input()` (formato definido más abajo).
- Usa un problema por defecto si el usuario no ingresa nada.
- Muestra el proceso paso a paso: tabla inicial, elección de variable que entra/sale, pivoteo y tabla resultante por iteración.
- Conserva historial completo (snapshots de tableau + variables básicas) para reconstruir el recorrido del Simplex.
- Genera visualizaciones automáticas al final, según la dimensión del problema:
  - n == 2: Región factible (mapa de nivel), líneas de restricción, recorrido de puntos básicos y solución óptima (2D).
  - n == 3: Superficies/planos de las restricciones, recorrido del Simplex en 3D, solución óptima y proyecciones 2D complementarias.
  - n > 3: No se grafica la región n-dimensional; en su lugar se muestran proyecciones 2D (pares x1–x2, x1–x3, x2–x3) y la convergencia del valor objetivo Z.
- Además se grafica la convergencia del valor objetivo Z vs iteraciones (válido para cualquier n).
- Código modular, con clase `BigMSimplexSolver`, utilidades para extracción de puntos y funciones de graficado separadas.
- Recomendación: para interactividad (rotar/hover), usar `plotly`; el código usa `matplotlib` por defecto.


Formato de entrada
Pegue exactamente un diccionario de Python con las claves:
{
  'A': [[...], [...], ...],        # matriz m x n (coeficientes de restricciones)
  'b': [...],                      # vector longitud m (lado derecho)
  'c': [...],                      # vector longitud n (coeficientes objetivo)
  'senses': ['<=','>=','=', ...],  # lista de longitud m con signos de cada restricción
  'maximize': True                 # opcional (True por defecto); usar False para minimizar
}

Ejemplos (pegar tal cual, o pulse Enter para usar el problema por defecto):
# Ejemplo 2 variables (2D)
{ 'A': [[1,1],[2,3]], 'b': [4,12], 'c': [3,5], 'senses': ['<=','<='], 'maximize': True }

# Ejemplo 3 variables (3D — mostrará gráfico 3D + proyecciones)
{ 'A': [[1, 2, 1], [3, 1, 2], [2, 3, 1]],
  'b': [10, 15, 12],
  'c': [4, 3, 2],
  'senses': ['<=', '<=', '<='],
  'maximize': True }

Notas importantes
- El método Simplex (Big M) funciona para cualquier n; la limitación en gráficos es únicamente visual. Para n > 3 verás proyecciones y la convergencia de Z.
- El historial guardado permite reconstruir y graficar el recorrido de puntos básicos visitados por el método.

*/

import { BigMSimplexSolver } from "./BigMSimplexSolver.js";
import { plotProblemAndSolution, plotZConvergence } from "./utilities.js";


// RENDERIZAR ELEMENTOS DE ENTRADA
function createMatrixInputs(rows, cols) {
    const container = document.getElementById("matrix");
    container.innerHTML = ""; // limpiar

    for (let i = 0; i < rows; i++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";

        for (let j = 0; j < cols; j++) {
            const input = document.createElement("input");
            input.type = "number";
            input.value = 0;
            input.className = "cell";
            input.dataset.row = i;
            input.dataset.col = j;
            input.style.width = "60px";
            input.style.margin = "4px";

            rowDiv.appendChild(input);
        }

        container.appendChild(rowDiv);
    }
}

function createBVectorsInputs(size) {
    for (let i = 0; i < 2; i++) {
        const container = i === 0 ? document.getElementById("vectorB") : document.getElementById("vectorC")
        container.innerHTML = ""; // limpiar

        const rowDiv = document.createElement("div");
        const title = document.createElement("h1");
        title.textContent = i === 0 ? "Vector B" : "Vector C";
        rowDiv.appendChild(title);
        rowDiv.className = "row";

        for (let j = 0; j < size; j++) {
            const input = document.createElement("input");
            input.type = "number";
            input.value = 0;
            input.className = "cell";
            input.dataset.row = i;
            input.dataset.col = j;
            input.style.width = "60px";
            input.style.margin = "4px";

            rowDiv.appendChild(input);
        }

        container.appendChild(rowDiv);
    }
}

function createSensesInputs(size, defaultSenses = ["<=", ">=", "="]) {
    const container = document.getElementById("senses");
    container.innerHTML = ""; // limpiar

    for (let i = 0; i < size; i++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "sense-row";
        rowDiv.style.margin = "6px 0";

        // label
        const label = document.createElement("label");
        label.textContent = `Restricción ${i + 1}: `;
        label.style.marginRight = "10px";
        rowDiv.appendChild(label);

        // select
        const select = document.createElement("select");
        select.className = "sense-select";
        select.dataset.row = i;

        ["<=", ">=", "="].forEach(optionValue => {
            const opt = document.createElement("option");
            opt.value = optionValue;
            opt.textContent = optionValue;
            select.appendChild(opt);
        });

        // cargar valor por defecto si existe
        if (defaultSenses && defaultSenses[i]) {
            select.value = defaultSenses[i];
        }

        rowDiv.appendChild(select);
        container.appendChild(rowDiv);
    }
}



// LEER LOS DATOS DEL HTML
function readMatrix() {
    const inputs = document.querySelectorAll("#matrix .cell");

    // determinar tamaño automáticamente
    let maxRow = 0;
    let maxCol = 0;

    inputs.forEach(inp => {
        maxRow = Math.max(maxRow, Number(inp.dataset.row));
        maxCol = Math.max(maxCol, Number(inp.dataset.col));
    });

    const rows = maxRow + 1;
    const cols = maxCol + 1;

    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    inputs.forEach(inp => {
        const r = Number(inp.dataset.row);
        const c = Number(inp.dataset.col);
        matrix[r][c] = Number(inp.value) || 0;
    });

    return matrix;
}

function readVector(vectorName) {
    const inputs = document.querySelectorAll(`#vector${vectorName} .cell`);

    // Hallar cuántas columnas tiene el vector
    let maxCol = -1;
    inputs.forEach(inp => {
        maxCol = Math.max(maxCol, Number(inp.dataset.col));
    });

    const size = maxCol + 1;
    const vector = new Array(size).fill(0);

    // Llenar el vector
    inputs.forEach(inp => {
        const c = Number(inp.dataset.col);
        vector[c] = Number(inp.value) || 0;
    });

    return vector;
}

function readSenses() {
    const selects = document.querySelectorAll("#senses .sense-select");

    // Determinar cuántas restricciones hay
    let maxRow = -1;
    selects.forEach(sel => {
        maxRow = Math.max(maxRow, Number(sel.dataset.row));
    });

    const size = maxRow + 1;
    const senses = new Array(size).fill("<="); // valor por defecto

    selects.forEach(sel => {
        const r = Number(sel.dataset.row);
        senses[r] = sel.value;
    });

    return senses;
}

function readMaxMin() {
    const checkbox = document.getElementById("max-min");
    return checkbox.checked;
}



// 
function setParamsMatrix() {
    const rows = numVars.value;
    const cols = numConstraints.value;

    createMatrixInputs(rows, cols);
    createBVectorsInputs(cols);
}

function loadDefaultData(size) {
    // Crear la matriz vacía
    createMatrixInputs(size, size);
    createBVectorsInputs(size);

    // Seleccionar la matriz correcta
    let data;
    if (size === 2) {
        data = {
            matriz: [
                [1, 1],
                [2, 3]
            ],
            b: [4, 12],
            c: [3, 5],
            senses: ["<=", "<="],
            maximize: true
        };
    } else if (size === 3) {
        data = {
            matriz: [
                [1, 2, 1],
                [3, 1, 2],
                [2, 3, 1]
            ],
            b: [10, 15, 12],
            c: [4, 3, 2],
            senses: ["<=", "<=", "<="],
            maximize: true
        };
    } else {
        console.error("Tamaño no soportado. Solo 2 o 3.");
        return;
    }

    // Llenar los inputs usando data[][]
    const matrix = document.querySelectorAll("#matrix .cell");
    matrix.forEach(input => {
        const r = Number(input.dataset.row);
        const c = Number(input.dataset.col);
        input.value = data.matriz[r][c];
    })

    const vectorInputsB = document.querySelectorAll("#vectorB .cell");
    vectorInputsB.forEach(input => {
        const r = Number(input.dataset.col);
        input.value = data.b[r];
    });

    const vectorInputsC = document.querySelectorAll("#vectorC .cell");
    vectorInputsC.forEach(input => {
        const r = Number(input.dataset.col);
        input.value = data.c[r];
    });

    createSensesInputs(size, data.senses);
    document.getElementById("max-min").checked = data.maximize;
}


function calcular() {
    const matrix = readMatrix();
    const vectorB = readVector("B");
    const vectorC = readVector("C");
    const sensesList = readSenses();
    const max_min = readMaxMin();

    let bigMSimplexSolver = new BigMSimplexSolver(matrix, vectorB, vectorC, sensesList, max_min, 1e6, true);
    const result = bigMSimplexSolver.solve(20);

    const showResults = document.getElementById("results");
    showResults.style.display = 'block';


    // Mostrar resultados en HTML
    const container = document.getElementById("result-container");
    const resultX = document.getElementById("result-x");
    const resultZ = document.getElementById("result-z");

    resultX.innerHTML = `<strong>x</strong> = [ ${result.x.join(", ")} ]`;
    resultZ.innerHTML = `<strong>Z</strong> = ${result.z.toFixed(4)}`;

    container.style.display = "block";


    // Graficar región factible + recorrido
    plotProblemAndSolution(matrix, vectorB, sensesList, result.x, result.history);

    // Graficar Z
    plotZConvergence(result.z_values);

}

document.addEventListener('DOMContentLoaded', () => {
    //OBTENER ELEMENTOS (Las variables ahora se definen aquí, después de que el DOM está listo)
    const numVars = document.getElementById("numVars");
    const numConstraints = document.getElementById("numConstraints");

    // AÑADIR LISTENERS
    if (numVars && numConstraints) {
        numVars.addEventListener("change", setParamsMatrix);
        numConstraints.addEventListener("change", setParamsMatrix);
    } else {
        console.error("Error: Uno o más elementos (numVars, numConstraints) no se encontraron en el DOM.");
    }
    
    // INICIALIZACIÓN POR DEFECTO
    createMatrixInputs(2, 2);
    createBVectorsInputs(2);
    createSensesInputs(2);
});



document.getElementById("btnMatrix2").addEventListener("click", () => loadDefaultData(2));
document.getElementById("btnMatrix3").addEventListener("click", () => loadDefaultData(3)); 
document.getElementById("btnCalcular").addEventListener("click", calcular);