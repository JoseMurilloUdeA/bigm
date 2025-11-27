import { renderTableau, renderIteration } from "./utilities.js";

export class BigMSimplexSolver {
    // Implementación didáctica del Método de la M Grande (Big M) para Programación Lineal
    constructor(A, b, c, senses, maximize = true, M = 1e6, verbose = true) {
        this.A = A;
        this.b = b;
        this.c = c;
        this.senses = senses;
        this.maximize = maximize;
        this.M = M;
        this.verbose = verbose;
        this._build_tableau();
    }

    _build_tableau() {
        const m = this.A.length;
        const n = this.A.length;

        let cols = [this.A];
        this.var_names = Array.from({ length: n }, (_, i) => `x${i + 1}`);

        let artificial = [];
        let slack = [];
        let excess = [];

        // Construir columnas adicionales
        this.senses.forEach((s, i) => {
            if (s === "<=") {
                let col = math.zeros(m, 1);
                col.set([i, 0], 1);
                cols.push(col);
                this.var_names.push(`s${slack.length + 1}`);
                slack.push(this.var_names.length - 1);

            } else if (s === ">=") {
                let col_ex = math.zeros(m, 1);
                col_ex.set([i, 0], -1);
                cols.push(col_ex);
                this.var_names.push(`e${excess.length + 1}`);
                excess.push(this.var_names.length - 1);

                let col_art = math.zeros(m, 1);
                col_art.set([i, 0], 1);
                cols.push(col_art);
                this.var_names.push(`a${artificial.length + 1}`);
                artificial.push(this.var_names.length - 1);

            } else if (s === "=") {
                let col_art = math.zeros(m, 1);
                col_art.set([i, 0], 1);
                cols.push(col_art);
                this.var_names.push(`a${artificial.length + 1}`);
                artificial.push(this.var_names.length - 1);

            } else {
                throw new Error(`Sentido no reconocido: ${s}`);
            }
        });

        // Aumentar matriz A con columnas extra
        let A_aug = cols.reduce((acc, col) => math.concat(acc, col, 1));

        const n_total = A_aug.size()[1];

        // Fila objetivo
        let c_ext = Array(n_total).fill(0);

        for (let i = 0; i < n; i++) {
            c_ext[i] = this.maximize ? this.c[i] : -this.c[i];
        }

        artificial.forEach(a => {
            c_ext[a] = -this.M;
        });

        // Crear tableau
        let tableau = math.zeros(m + 1, n_total + 1).toArray();

        // Filas de restricciones
        for (let i = 0; i < m; i++) {
            tableau[i + 1].splice(0, n_total, ...A_aug.toArray()[i]);
            tableau[i + 1][n_total] = this.b[i];
        }

        // Fila objetivo
        for (let j = 0; j < n_total; j++) {
            tableau[0][j] = -c_ext[j];
        }

        // Guardar atributos
        this.tableau = tableau;
        this.artificial = artificial;
        this.n_total = n_total;

        // Determinar variables básicas iniciales
        this.basic_vars = [];

        for (let j = 0; j < this.n_total; j++) {
            const col = tableau.slice(1).map(row => row[j]); // excluir fila objetivo

            const ones = col.filter(v => Math.abs(v - 1) < 1e-9).length;
            const nonzeros = col.filter(v => Math.abs(v) > 1e-9).length;

            if (ones === 1 && nonzeros === 1) {
                this.basic_vars.push(j);
            }
        }

        if (this.verbose) {
            const container = document.getElementById("tableau-container");
            renderTableau(this.tableau, this.var_names, this.basic_vars, container);
        }
    }

    _tableau_df() {
        // Devuelve un objeto tipo tabla (no DataFrame)
        const columns = ["Basic", ...this.var_names, "RHS"];

        const rows = this.tableau.map((row, i) => {
            const basic = i === 0 ? "" : this.var_names[this.basic_vars[i - 1]];

            const data = {
                Basic: basic
            };

            this.var_names.forEach((name, j) => {
                data[name] = row[j];
            });

            data["RHS"] = row[row.length - 1];

            return data;
        });

        return { columns, rows };
    }

    _select_entering() {
        const row = this.tableau[0].slice(0, -1); // fila objetivo sin RHS

        // Si todas son >= -1e-10 → óptimo
        if (row.every(v => v >= -1e-10)) {
            return null;
        }

        // Retorna el índice del valor mínimo
        let minIndex = 0;
        for (let i = 1; i < row.length; i++) {
            if (row[i] < row[minIndex]) minIndex = i;
        }

        return minIndex;
    }

    _select_leaving(entering) {
        const col = this.tableau.slice(1).map(r => r[entering]);      // columna sin fila objetivo
        const rhs = this.tableau.slice(1).map(r => r[r.length - 1]);  // RHS

        const ratios = col.map((v, i) => (v > 1e-10 ? rhs[i] / v : Infinity));

        if (ratios.every(r => !isFinite(r))) {
            return null; // problema no acotado
        }

        // posición del mínimo +1 porque excluimos fila 0
        let minIndex = 0;
        for (let i = 1; i < ratios.length; i++) {
            if (ratios[i] < ratios[minIndex]) minIndex = i;
        }

        return minIndex + 1;
    }

    _pivot(row, col) {
        const pivot = this.tableau[row][col];

        // Dividir fila pivote por valor del pivote
        this.tableau[row] = this.tableau[row].map(v => v / pivot);

        // Para las demás filas: fila = fila - (coef * fila_pivote)
        for (let r = 0; r < this.tableau.length; r++) {
            if (r === row) continue;

            const factor = this.tableau[r][col];
            this.tableau[r] = this.tableau[r].map((v, j) =>
                v - factor * this.tableau[row][j]
            );
        }

        // Actualizar variable básica
        this.basic_vars[row - 1] = col;
    }

    solve(max_iter = 20) {
        const history = [];
        const z_values = [];

        // limpiar HTML previo
        document.getElementById("simplex-iterations").innerHTML = "<h2>Iteraciones del Método Simplex</h2>";

        for (let k = 1; k <= max_iter; k++) {

            // Copiar tableau
            history.push(this.tableau.map(row => [...row]));
            z_values.push(this.tableau[0][this.tableau[0].length - 1]);

            // SELECCIÓN DE ENTRANTE
            const enteringIndex = this._select_entering();
            const enteringName = enteringIndex !== null ? this.var_names[enteringIndex] : null;

            if (enteringIndex === null) {
                renderIteration(k, "Óptimo", "-", this.tableau, this.var_names, this.basic_vars);
                break;
            }

            // SELECCIÓN DE SALIENTE
            const leavingRow = this._select_leaving(enteringIndex);
            if (leavingRow === null) {
                throw new Error("Problema ilimitado (ninguna variable sale).");
            }

            const leavingName = this.var_names[this.basic_vars[leavingRow - 1]];

            // Mostrar iteración antes del pivoteo
            renderIteration(
                k,
                enteringName,
                leavingName,
                this.tableau,
                this.var_names,
                this.basic_vars
            );

            // HACER EL PIVOTEO
            this._pivot(leavingRow, enteringIndex);
        }

        return this._get_solution(history, z_values);
    }



    _get_solution(history, z_values) {
        const m = this.tableau.length - 1;
        const x = Array(this.n_total).fill(0);

        // Recuperar solución básica
        for (let i = 0; i < m; i++) {
            x[this.basic_vars[i]] = this.tableau[i + 1][this.tableau[0].length - 1];
        }

        const z = this.tableau[0][this.tableau[0].length - 1];

        // Verificar que las artificiales sean 0
        for (const a of this.artificial) {
            if (Math.abs(x[a]) > 1e-9) {
                throw new Error("Problema infactible: variable artificial no nula.");
            }
        }

        // Retornar solo las variables originales (las primeras len(c))
        return {
            x: x.slice(0, this.c.length),
            z,
            history,
            z_values
        };
    }
}