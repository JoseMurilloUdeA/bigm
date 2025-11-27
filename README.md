# Big M Simplex – Documentación General (Versión JS + HTML)

## Características principales

* Permite ingresar el problema **mediante una interfaz HTML**, donde el usuario añade:

  * Matriz **A**
  * Vector **b**
  * Vector **c**
  * Lista de **senses**
  * Opción **Maximizar / Minimizar**

* Muestra el proceso paso a paso mediante:

  * Tabla inicial
  * Selección de variable entrante y saliente
  * Operación de pivoteo
  * Tabla resultante por iteración

* Conserva **historial completo** (snapshots del tableau + variables básicas)
  → usado para graficar el **recorrido del Simplex**.

* Genera visualizaciones automáticas según la dimensión del problema:

  * **n = 2**
    → Gráfica 2D de región factible + restricciones + recorrido + solución óptima.

  * **n > 3**
    → No se puede graficar en nD; en su lugar:

    * Proyecciones 2D:

      * (x₁, x₂)
      * (x₁, x₃)
      * (x₂, x₃)
    * Gráfica de convergencia del valor objetivo Z

* En **todos los casos**, se genera:

  * **Gráfica de convergencia de Z** vs iteraciones

* Código modular basado en:

  * Clase `BigMSimplexSolver`
  * Funciones auxiliares de extracción de puntos básicos
  * Funciones de graficado 2D

---

## Formato de Entrada

La interfaz HTML permite ingresar directamente:

### Matriz de restricciones **A**

Cada fila corresponde a una restricción.

### Vector **b**

Lado derecho de cada restricción.

### Vector **c**

Coeficientes de la función objetivo.

### Senses

Cada restricción puede ser:

* `<=`
* `>=`
* `=`

### Tipo de objetivo

* `Max`
* `Min`
