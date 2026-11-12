CREATE DATABASE IF NOT EXISTS supermarket_simulator;
USE supermarket_simulator;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    categoria_id INT NOT NULL,
    precio_base DECIMAL(12, 2) NOT NULL CHECK (precio_base >= 0),
    iva_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (iva_pct >= 0 AND iva_pct <= 100.00),
    stock INT NOT NULL CHECK (stock >= 0),
    imagen_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
);


CREATE TABLE jornadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NULL,
    estado ENUM('abierta', 'cerrada') NOT NULL DEFAULT 'abierta',
    -- Dueño de la jornada: un identificador anónimo (UUID) que genera el navegador del jugador. No hay cuentas.
    jugador CHAR(36) NOT NULL,
    -- 1 mientras la jornada esté abierta, NULL si está cerrada. Con el índice único (jugador, abierta) (que ignora NULL)
    -- hay como máximo UNA jornada abierta POR JUGADOR, incluso con peticiones simultáneas.
    -- Es un número y no una copia del identificador: MariaDB 10.11 rechaza funciones sobre columnas de texto en columnas STORED.
    abierta TINYINT GENERATED ALWAYS AS (IF(estado = 'abierta', 1, NULL)) STORED,
    perdida_total DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (perdida_total >= 0),
    sobrecobro_total DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (sobrecobro_total >= 0),
    -- Puntos de la jornada para el ranking. Los calcula el navegador y el servidor los recorta a lo posible al cerrarla.
    puntos INT NOT NULL DEFAULT 0 CHECK (puntos >= 0),
    UNIQUE KEY uq_jornada_abierta (jugador, abierta),
    KEY idx_jornadas_jugador (jugador)
);

-- Jugadores del ranking: una fila por identificador anónimo, que se crea al cerrar su primera jornada (o al elegir apodo).
-- El total ya viene sumado: el ranking no recalcula nada al consultarse.
-- La colación (sin distinción de mayúsculas ni tildes) hace que «Ana», «ana» y «Aná» choquen en el índice único.
-- `actualizado` solo cambia cuando cambian los puntos (desempate: gana quien llegó antes a esa cifra); no lleva ON UPDATE.
CREATE TABLE jugadores (
    id CHAR(36) NOT NULL PRIMARY KEY,
    apodo VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    apodo_cambiado TIMESTAMP NULL,
    puntos_total INT NOT NULL DEFAULT 0 CHECK (puntos_total >= 0),
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_jugadores_apodo (apodo),
    KEY idx_jugadores_ranking (puntos_total, actualizado)
) DEFAULT CHARSET = utf8mb4;

-- Contador de peticiones por IP (ventana fija de un minuto) para limitar apodo.php y ranking.php sin depender de nada externo.
-- Una fila por cliente y tipo; no se borra nada (el usuario web no tiene DELETE): se reutiliza al cambiar de ventana.
CREATE TABLE limite_peticiones (
    clave CHAR(40) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    ventana INT UNSIGNED NOT NULL,
    n INT UNSIGNED NOT NULL
);

-- Stock propio de cada jugador (una fila por jugador y producto, que se crea la primera vez que hace falta).
-- productos.stock es el stock BASE con el que empieza cada jugador.
CREATE TABLE stock_jugador (
    jugador CHAR(36) NOT NULL,
    producto_id INT NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0),
    PRIMARY KEY (jugador, producto_id),
    CONSTRAINT fk_stock_jugador_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id)
);


CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE,
    cliente_nombre VARCHAR(100) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
        CHECK (subtotal >= 0),
    iva_total DECIMAL(12, 2) NOT NULL
        CHECK (iva_total >= 0),
    descuento_total DECIMAL(12, 2) NOT NULL
        DEFAULT 0 CHECK (descuento_total >= 0),
    total DECIMAL(12, 2) NOT NULL
        CHECK (total >= 0),
    efectivo_recibido DECIMAL(12, 2) NOT NULL
        CHECK (efectivo_recibido >= 0),
    cambio DECIMAL(12, 2) NOT NULL
        CHECK (cambio >= 0),
    fecha_hora TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('completada', 'cancelada')
        NOT NULL DEFAULT 'completada',
    jornada_id INT NOT NULL,

    CONSTRAINT fk_ventas_jornada
        FOREIGN KEY (jornada_id)
        REFERENCES jornadas(id)
);

CREATE TABLE detalles_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    iva_pct DECIMAL(5, 2) NOT NULL CHECK (iva_pct >= 0 AND iva_pct <= 100.00),
    subtotal_linea DECIMAL(12, 2) NOT NULL CHECK (subtotal_linea >= 0),
    iva_linea DECIMAL(12, 2) NOT NULL CHECK (iva_linea >= 0),
    total_linea DECIMAL(12, 2) NOT NULL CHECK (total_linea >= 0),
    
    CONSTRAINT fk_venta_detalles_venta
        FOREIGN KEY (venta_id)
        REFERENCES ventas(id),

    CONSTRAINT fk_venta_detalles_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id)
);

