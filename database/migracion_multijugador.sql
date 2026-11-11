-- Migración a varios jugadores: cada jugador (identificador anónimo del navegador) tiene su jornada y su stock.
-- Para una base ya creada con el esquema anterior. Se puede ejecutar más de una vez (cada paso comprueba si ya está hecho):
--   mysql -u USUARIO -p supermarket_simulator < database/migracion_multijugador.sql
-- Las jornadas que ya existían quedan a nombre de un jugador «heredado» (nadie lo usará), incluida la abierta si la hay.

-- Ejecuta una sentencia solo si la condición se cumple
DROP PROCEDURE IF EXISTS migrar_paso;
DELIMITER //
CREATE PROCEDURE migrar_paso(IN condicion BOOLEAN, IN sentencia TEXT)
BEGIN
    IF condicion THEN
        SET @sql = sentencia;
        PREPARE s FROM @sql;
        EXECUTE s;
        DEALLOCATE PREPARE s;
    END IF;
END //
DELIMITER ;

SET @db = DATABASE();

-- 1) Columna del dueño de la jornada
CALL migrar_paso(
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'jornadas' AND column_name = 'jugador'),
    "ALTER TABLE jornadas ADD COLUMN jugador CHAR(36) NOT NULL DEFAULT '00000000-0000-4000-8000-000000000000' AFTER estado");

-- 2) Una sola jornada abierta POR JUGADOR: columna `abierta` (1 si está abierta, NULL si no) + índice único (jugador, abierta).
--    Se retiran las versiones anteriores (abierta_unica, y abierta_jugador, que MariaDB 10.11 no admite como columna STORED).
CALL migrar_paso(
    EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'jornadas' AND index_name = 'uq_jornada_abierta'
            AND NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'jornadas' AND index_name = 'uq_jornada_abierta' AND column_name = 'abierta')),
    "ALTER TABLE jornadas DROP INDEX uq_jornada_abierta");
CALL migrar_paso(
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'jornadas' AND column_name = 'abierta_unica'),
    "ALTER TABLE jornadas DROP COLUMN abierta_unica");
CALL migrar_paso(
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'jornadas' AND column_name = 'abierta_jugador'),
    "ALTER TABLE jornadas DROP COLUMN abierta_jugador");
CALL migrar_paso(
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'jornadas' AND column_name = 'abierta'),
    "ALTER TABLE jornadas ADD COLUMN abierta TINYINT GENERATED ALWAYS AS (IF(estado = 'abierta', 1, NULL)) STORED");
CALL migrar_paso(
    NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'jornadas' AND index_name = 'uq_jornada_abierta'),
    "ALTER TABLE jornadas ADD UNIQUE KEY uq_jornada_abierta (jugador, abierta)");
CALL migrar_paso(
    NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'jornadas' AND index_name = 'idx_jornadas_jugador'),
    "ALTER TABLE jornadas ADD KEY idx_jornadas_jugador (jugador)");
ALTER TABLE jornadas ALTER COLUMN jugador DROP DEFAULT;

-- 3) Stock propio de cada jugador; productos.stock pasa a ser el stock BASE con el que empieza cada uno
CREATE TABLE IF NOT EXISTS stock_jugador (
    jugador CHAR(36) NOT NULL,
    producto_id INT NOT NULL,
    stock INT NOT NULL CHECK (stock >= 0),
    PRIMARY KEY (jugador, producto_id),
    CONSTRAINT fk_stock_jugador_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id)
);

DROP PROCEDURE migrar_paso;
