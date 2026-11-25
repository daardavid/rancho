# Guía visual de RANCHO

Aprobada por David el 2026-11-24. Es la referencia de cómo se ve y se siente la app. Las maquetas de las cuatro pantallas están en [maqueta/](maqueta/): son archivos `.dc.html` del lienzo de diseño. No se abren como página normal, pero su marcado trae los estilos exactos (colores, tamaños, espacios) y los datos de ejemplo de cada pantalla. Los datos de las maquetas son inventados: no son del rancho.

## Principios

1. **Una acción principal por pantalla**, grande y siempre a la mano. Nada de botones repetidos con el mismo destino.
2. **Primero lo que hay que atender**: huecos de pesaje y animales a revisar arriba y con color de aviso.
3. **Capturar con el pulgar**: botones y campos de al menos 44 px de alto (56 px para la acción principal), números grandes, teclado numérico para kilos y aretes.
4. **Elegir en vez de escribir**: tipo, sexo y tenencia son botones de un toque; «No sé» siempre es una opción visible y no se ve como error.
5. **Lo opcional, escondido**: en «Más datos», no en la vista principal.
6. **El color dice algo**: verde = va bien o acción principal; ámbar = revisar; gris = sin datos. Nunca solo color: siempre va con texto.

## Colores

| Token | Valor | Uso |
| --- | --- | --- |
| `--fondo` | `#F5F3EE` | Fondo de la app |
| `--superficie` | `#FFFFFF` | Tarjetas, barras, campos |
| `--borde` | `#E3E0D8` | Bordes de tarjetas y botones secundarios |
| `--borde-campo` | `#CFCBC1` | Bordes de campos |
| `--texto` | `#1C1F1A` | Texto principal |
| `--texto-suave` | `#5C6258` | Texto secundario (contraste ≥ 4.5:1 sobre blanco) |
| `--verde` | `#1F5C3F` | Acción principal, seleccionado, va bien |
| `--verde-hover` | `#163F2B` | Hover y presionado |
| `--verde-fondo` | `#E6EFE9` | Fondo de seleccionado y de etiqueta «va bien» |
| `--ambar-texto` | `#8A4B00` | Texto de aviso |
| `--ambar-fuerte` | `#6B3A00` | Títulos de aviso |
| `--ambar-fondo` | `#FDF1DE` | Fondo de aviso y de etiqueta «revisar» |
| `--ambar-barra` | `#D9A55B` | Barras de avance y de ganancia baja |
| `--neutro-fondo` | `#EFEDE8` | Etiqueta «sin datos», pista de barras |
| `--error` | `#8A2F26` sobre `#FBEAE7` | Errores |

## Tipografía

- Títulos y números: **Archivo** 700–800.
- Texto: **Inter** 400–600, 16–17 px en campos (evita el zoom de iOS).
- Las fuentes se sirven desde la app (paquetes `@fontsource/archivo` y `@fontsource/inter`), nunca desde Google: la app debe funcionar sin internet en la red de la casa.

| Elemento | Tamaño |
| --- | --- |
| Título de pantalla | Archivo 800, 30 px (24 px en pantallas con «regresar») |
| Etiqueta de sección (MAYÚSCULAS) | Inter 600, 13 px, `letter-spacing: .04em` |
| Kilos en captura | Archivo 700, 28 px |
| Número de tarjeta resumen | Archivo 800, 22 px |
| Texto secundario | Inter 13–14 px |

## Forma y espacio

- Radios: 14 px campos y botones; 16 px tarjetas; 18 px tarjeta activa; 99 px etiquetas y filtros.
- Márgenes laterales de 20 px; espacio entre tarjetas de 8 px; entre secciones de 16 px.
- Sombra solo en la acción flotante principal: `0 8px 20px rgba(31,92,63,.28)`.
- Íconos: trazo de 2 px, 20–24 px, como componentes SVG propios en `apps/web/src/ui/iconos.tsx`; sin biblioteca de íconos ni emoji.

## Componentes

| Componente | Descripción |
| --- | --- |
| `Encabezado` | Etiqueta de sección opcional, título, subtítulo; a la derecha hasta dos botones de ícono (44×44, radio 14). Variante con flecha de regresar. |
| `BotonPrincipal` | Verde, 56 px, texto blanco 17 px 600. Uno por pantalla. |
| `BotonSecundario` | Blanco con borde, texto verde o tinta. |
| `BotonFlotante` | El principal, flotando sobre la barra inferior (Hato). |
| `BarraDeAccion` | Pie fijo blanco con borde superior que contiene el botón principal (Pesaje, Alta). |
| `BarraInferior` | Navegación fija abajo, 72 px, cuatro pestañas con ícono y texto (Inicio, Hato, Pesaje, Crecimiento); la activa en verde. Fija al borde inferior de la ventana también en computadora. |
| `Tarjeta` | Blanca, radio 16, borde `#ECE9E2`. |
| `FilaDeAnimal` | Avatar con iniciales (color por categoría), nombre, detalle (categoría · arete), último peso y etiqueta de ganancia. |
| `Etiqueta` | Píldora pequeña: verde (va bien), ámbar (revisar), gris (sin datos). |
| `Filtros` | Píldoras de 36 px; la activa en tinta con texto blanco. |
| `Mosaicos` | Rejilla de botones grandes de 64 px para elegir una opción (tipo de animal). |
| `Segmentado` | Control de 3 opciones sobre fondo `#ECE9E2` (sexo, calidad del peso). |
| `Aviso` | Tarjeta ámbar con ícono, título, detalle y enlace. |
| `CampoDeKilos` | Número grande, sufijo «kg», `inputmode="decimal"`, botón de cámara al lado. |
| `BarraDeAvance` | Barra de 8 px con tramo verde (pesados) y ámbar (no se pesó). |
| `Resumen` | Tres tarjetas de número arriba de Crecimiento. |

## Computadora

La app es la misma columna que en el celular, centrada (máximo 30 rem), con la barra inferior y las barras de acción fijas al borde inferior de la ventana y del ancho de la columna. Nada queda flotando a media pantalla.
