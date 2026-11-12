<?php

/** Apodos y tabla de posiciones. Los puntos se suman al cerrar la jornada (JornadaService), no aquí. */
class RankingService
{
    public const TOP = 5;
    public const APODO_MIN = 3;
    public const APODO_MAX = 20;
    private const ESPERA_CAMBIO_SEGUNDOS = 86400;
    private const MYSQL_DUPLICATE_KEY = 1062;

    // Palabras que no pueden formar parte del apodo (se comparan sin tildes, sin mayúsculas, sin separadores y con
    // los números típicos cambiados por letras: 0=o 1=i 3=e 4=a 5=s 7=t). Lista corta a propósito; ver docs/SEGURIDAD.md.
    // Las largas bloquean si aparecen en cualquier parte; las cortas solo si son una palabra completa del apodo
    // (si no, «computadora» contendría «puta» y «Penélope» contendría «pene»).
    private const BLOQUEADAS_EN_CUALQUIER_PARTE = [
        'hijueputa', 'hijoeputa', 'malparido', 'gonorrea', 'pendejo', 'mierda', 'cabron', 'hitler', 'nazi',
        'violador', 'pedofilo', 'follar', 'chingad', 'culero',
    ];
    private const BLOQUEADAS_PALABRA_COMPLETA = [
        'puta', 'puto', 'verga', 'pene', 'culo', 'marica', 'zorra', 'perra', 'idiota', 'imbecil', 'sexo', 'porno',
        'admin', 'administrador', 'moderador', 'soporte', 'staff', 'nigga', 'fuck', 'shit',
    ];

    public function __construct(private PDO $pdo, private JugadorRepository $jugadores) {}

    /** Valida y normaliza un apodo (recorta espacios). Lanza InvalidArgumentException (422) si no sirve. */
    public static function validarApodo(mixed $apodo): string
    {
        if (!is_string($apodo)) {
            throw new InvalidArgumentException('El apodo debe ser un texto');
        }
        $apodo = preg_replace(['/^\s+|\s+$/u', '/ {2,}/'], ['', ' '], $apodo);   // recorta y junta espacios repetidos
        if ($apodo === null) {
            throw new InvalidArgumentException('El apodo no es un texto válido');       // UTF-8 inválido
        }
        $largo = mb_strlen($apodo);
        if ($largo < self::APODO_MIN || $largo > self::APODO_MAX) {
            throw new InvalidArgumentException('El apodo debe tener entre ' . self::APODO_MIN . ' y ' . self::APODO_MAX . ' caracteres');
        }
        if (!preg_match('/^[\p{L}\p{N} _-]+$/u', $apodo)) {
            throw new InvalidArgumentException('El apodo solo puede llevar letras, números, espacios, _ y -');
        }
        if (self::estaBloqueado($apodo)) {
            throw new InvalidArgumentException('Ese apodo no está permitido');
        }

        return $apodo;
    }

    /** Pone o cambia el apodo del jugador. 409 si lo tiene otro, 429 si lo cambió hace menos de 24 h. */
    public function fijarApodo(string $jugador, mixed $apodo): string
    {
        $apodo = self::validarApodo($apodo);

        $this->pdo->beginTransaction();
        try {
            $this->jugadores->asegurar($jugador);
            $actual = $this->jugadores->apodoParaActualizar($jugador);       // bloquea su fila: dos cambios a la vez se encolan

            if ($actual['apodo'] !== $apodo) {                               // repetir el mismo apodo no gasta el cambio diario
                if ($actual['segundos'] !== null && $actual['segundos'] < self::ESPERA_CAMBIO_SEGUNDOS) {
                    throw new ApiException(429, 'Solo puedes cambiar de apodo una vez cada 24 horas');
                }
                try {
                    $this->jugadores->fijarApodo($jugador, $apodo);
                } catch (PDOException $e) {
                    if (($e->errorInfo[1] ?? null) === self::MYSQL_DUPLICATE_KEY) {
                        throw new RuntimeException('Ese apodo ya está en uso');
                    }
                    throw $e;
                }
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        return $apodo;
    }

    /** {top: [{posicion, apodo, puntos}…], yo: null | {apodo, puntos, posicion}}. Sin identificadores. */
    public function ranking(?string $jugador): array
    {
        $top = [];
        foreach ($this->jugadores->top(self::TOP) as $i => $fila) {
            $top[] = ['posicion' => $i + 1, 'apodo' => $fila['apodo'], 'puntos' => (int) $fila['puntos']];
        }

        return ['top' => $top, 'yo' => $jugador === null ? null : $this->jugadores->yo($jugador)];
    }

    private static function estaBloqueado(string $apodo): bool
    {
        $minusculas = mb_strtolower($apodo);
        $sinTildes = strtr($minusculas, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
        $sinNumeros = strtr($sinTildes, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't']);

        $junto = preg_replace('/[^a-z]/', '', $sinNumeros);              // «p u_t-a» -> «puta»
        foreach (self::BLOQUEADAS_EN_CUALQUIER_PARTE as $palabra) {
            if (str_contains($junto, $palabra)) {
                return true;
            }
        }
        $palabras = preg_split('/[^a-z]+/', $sinNumeros, -1, PREG_SPLIT_NO_EMPTY);
        $palabras[] = $junto;                                            // también el apodo entero sin separadores
        return array_intersect($palabras, self::BLOQUEADAS_PALABRA_COMPLETA) !== [];
    }
}
