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
    UNIQUE KEY uq_jornada_abierta (jugador, abierta),
    KEY idx_jornadas_jugador (jugador)
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

