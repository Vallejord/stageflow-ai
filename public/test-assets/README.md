# Test Assets para StageFlow AI

Este directorio contiene archivos de prueba que el agente usará para completar campos de tipo "file" en formularios.

## Archivos Requeridos

Coloca aquí los siguientes archivos:

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `foto-obra.jpg` | Foto representativa de la obra (300 DPI recomendado) | Campos que piden fotos/imágenes |
| `dossier.pdf` | Dossier de la obra o carpeta técnica | Campos que piden dossier/documentación |

## Ejemplo de estructura

```
public/test-assets/
├── README.md
├── foto-obra.jpg    ← Imagen JPG de la obra
└── dossier.pdf      ← PDF con información de la obra
```

## Notas

- Estos archivos son solo para pruebas
- En producción, se usarán los archivos reales de cada obra
- El agente detectará automáticamente qué tipo de archivo subir según el contexto del formulario
