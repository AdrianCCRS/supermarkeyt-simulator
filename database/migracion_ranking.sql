-- Migración del ranking: puntos por jornada, tabla de jugadores (apodo y total) y contador de peticiones.
-- Para una base ya creada con el esquema anterior. Es SOLO aditiva (el código viejo sigue funcionando) y se puede
-- ejecutar más de una vez (cada paso comprueba si ya está hecho). Úsala con un usuario administrador y respaldo previo:
--   mysql -u USUARIO -p supermarket_simulator < database/migracion_ranking.sql
-- Las jornadas que ya existían quedan con 0 puntos: el ranking empieza en cero.
-- Si el usuario web se creó con 99-permisos.sh ya tiene SELECT/INSERT/UPDATE sobre toda la base, incluidas las tablas nuevas.

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

-- 1) Puntos de cada jornada
CALL migrar_paso(
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = @db AND table_name = 'jornadas' AND column_name = 'puntos'),
    "ALTER TABLE jornadas ADD COLUMN puntos INT NOT NULL DEFAULT 0 CHECK (puntos >= 0) AFTER sobrecobro_total");

-- 2) Jugadores del ranking (ver el comentario de init.sql)
CREATE TABLE IF NOT EXISTS jugadores (
    id CHAR(36) NOT NULL PRIMARY KEY,
    apodo VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    apodo_cambiado TIMESTAMP NULL,
    puntos_total INT NOT NULL DEFAULT 0 CHECK (puntos_total >= 0),
    creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_jugadores_apodo (apodo),
    KEY idx_jugadores_ranking (puntos_total, actualizado)
) DEFAULT CHARSET = utf8mb4;

-- 3) Contador de peticiones por IP
CREATE TABLE IF NOT EXISTS limite_peticiones (
    clave CHAR(40) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    ventana INT UNSIGNED NOT NULL,
    n INT UNSIGNED NOT NULL
);

DROP PROCEDURE migrar_paso;
