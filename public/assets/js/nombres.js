/**
 * Nombres aleatorios para los clientes simulados (nombre + apellido, típicos de Colombia).
 * Lógica pura (sin Phaser ni red). El nombre completo viaja al backend en el cobro (máx. 100 caracteres en la API);
 * en pantalla solo se muestra el primer nombre.
 */
const Nombres = (function () {
    const NOMBRES = [
        'Camila', 'Valentina', 'Sofia', 'Isabella', 'Mariana', 'Daniela', 'Juliana', 'Laura', 'Paula', 'Andrea',
        'Natalia', 'Carolina', 'Luisa', 'Manuela', 'Sara', 'Gabriela', 'Alejandra', 'Maria', 'Lucia', 'Catalina',
        'Santiago', 'Mateo', 'Sebastian', 'Juan', 'Andres', 'Camilo', 'Daniel', 'Felipe', 'Nicolas', 'David',
        'Carlos', 'Diego', 'Julian', 'Esteban', 'Jorge', 'Luis', 'Miguel', 'Samuel', 'Tomas', 'Alejandro'
    ];
    const APELLIDOS = [
        'Rodriguez', 'Gomez', 'Martinez', 'Lopez', 'Garcia', 'Hernandez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez',
        'Torres', 'Diaz', 'Vargas', 'Castro', 'Rojas', 'Moreno', 'Jimenez', 'Ortiz', 'Medina', 'Cardenas',
        'Mejia', 'Osorio', 'Restrepo', 'Zapata', 'Giraldo', 'Cortes', 'Acosta', 'Parra', 'Cruz', 'Salazar'
    ];

    function elegir(lista, rnd) { return lista[Math.floor(rnd() * lista.length)]; }

    /** {nombre: 'Camila', completo: 'Camila Rojas'} */
    function generar(rnd) {
        const r = rnd || Math.random;
        const nombre = elegir(NOMBRES, r);
        return { nombre, completo: nombre + ' ' + elegir(APELLIDOS, r) };
    }

    return { generar, NOMBRES, APELLIDOS };
})();
