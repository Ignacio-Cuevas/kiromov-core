# KIROMOV Core - Sistema de Gestión Clínica y Operativa

Web App interna desarrollada a medida para **KIROMOV Centro Clínico**, orientada al seguimiento clínico de pacientes, control de paquetes de sesiones, registro ágil de asistencias y redacción de notas clínicas estructuradas (formato SOAP con Escala Visual Análoga ENA 0-10).

---

## 🚀 Tecnologías Principales

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Lenguaje**: TypeScript (Modo Estricto)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) con paleta clínica personalizada
- **Componentes UI**: Inspirados en shadcn/ui (Sheet / Drawer lateral, Data Table, Cards, Tabs, Badges semánticos, Input, Textarea, Progress Bar)
- **Iconografía**: `lucide-react`
- **Base de Datos & Backend**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Notificaciones**: `sonner` (Toast feedback en tiempo real)

---

## 📋 Estructura de la Base de Datos

El archivo [`supabase_schema.sql`](./supabase_schema.sql) contiene el DDL completo listo para ser ejecutado en el **SQL Editor** de Supabase:

1. **`pacientes`**: Datos filiatorios (RUT, Nombre, Teléfono, Email, Diagnóstico).
2. **`compras_planes`**: Contratos de paquetes kinesiológicos (Total de sesiones, valor, fecha).
3. **`citas_atenciones`**: Registro de asistencias y atenciones profesionales.
4. **`evoluciones_soap`**: Notas clínicas estructuradas (Subjetivo, Objetivo con ENA 0-10, Análisis, Plan).
5. **`vista_resumen_pacientes`**: Vista SQL optimizada que consolida las sesiones consumidas, sesiones restantes, última fecha de atención y el estado del plan (`Plan Vigente`, `Por Renovar (1 restante)`, `Plan Finalizado`, `Sin Plan Activo`).

---

## ⚙️ Configuración y Puesta en Marcha

### 1. Variables de Entorno
Crea o edita el archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_supabase
```

> **Nota de Resiliencia**: Si las credenciales de Supabase no están configuradas, la aplicación activa automáticamente el motor local de demostración para permitir la prueba completa de la interfaz sin interrupciones.

### 2. Instalación y Ejecución Local
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en modo producción
npm run start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🩺 Funcionalidades Principales

### 1. Dashboard Clínico (`/`)
- **Header Superior**:
  - Marca e isotipo de Kiromov.
  - Buscador reactivo por **Nombre** o **RUT** (con formateo automático).
  - Perfil profesional activo: `Klgo. Ignacio Cuevas`.
- **Tarjetas KPI**:
  - **Atenciones Hoy**: Total de pacientes atendidos durante la jornada.
  - **Por Renovar (1 restante)**: Alerta con filtro interactivo en 1 clic.
  - **Planes Vigentes**: Cantidad de pacientes en tratamiento activo.
- **Tabla de Pacientes**:
  - Barra de progreso visual de consumo de sesiones (ej: `3/4 sesiones`).
  - Badges semánticos según estado del plan.
  - Botón directo `[ + Asistencia ]` por paciente para marcar presencia en 1 segundo.

### 2. Panel Lateral de Paciente (`PatientDrawer`)
- Slide-over responsivo que se abre al tocar cualquier paciente en la tabla:
  - Información general y enlace directo con saludo preformateado a **WhatsApp** (`https://wa.me/56...`).
  - Botón destacado `[ ✓ Registrar Asistencia Hoy ]`.
  - **Tab Evolución SOAP**:
    - Campos **S**, **O**, **A**, **P**.
    - **Selector Visual de Dolor (ENA 0-10)** interactivo con código de colores según nivel de severidad.
    - Historial cronológico de notas clínicas previas.
  - **Tab Historial**:
    - Timeline con todas las atenciones y asistencias previas del paciente.
  - **Tab Planes**:
    - Detalle de paquetes de sesiones comprados y estado de vigencia.
