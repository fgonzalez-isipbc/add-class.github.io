const obtenerUsuarios = () => new Promise(res => setTimeout(() => res(["Ana", "Carlos"]), 2000));
const obtenerProductos = () => new Promise(res => setTimeout(() => res(["Laptop", "Mouse"]), 2000));

async function cargarDashboardOptimizado() {
    try {
        console.log("Cargando dashboard...");
        const inicio = Date.now();

        // Lanzamos ambas peticiones en paralelo
        const [usuarios, productos] = await Promise.all([
            obtenerUsuarios(),
            obtenerProductos()
        ]);

        const tiempoTotal = (Date.now() - inicio) / 1000;
        console.log(`✅ Datos cargados en ${tiempoTotal} segundos:`, { usuarios, productos });
    } catch (error) {
        console.error("Error cargando el dashboard:", error);
    }
}

cargarDashboardOptimizado();
// Tiempo total: ~2 segundos en lugar de 4

async function cargarDashboardLento() {
    console.log("Cargando dashboard...");
    const inicio = Date.now();

    const usuarios = await obtenerUsuarios(); // Tarda 2 segundos
    const productos = await obtenerProductos(); // Tarda 2 segundos
    // Tiempo total: 4 segundos (se ejecutan uno tras otro)
    const tiempoTotal = (Date.now() - inicio) / 1000;
    console.log(`✅ Datos cargados en ${tiempoTotal} segundos:`, { usuarios, productos });
}

cargarDashboardLento();
