-- Agregar categoria_tarifa a pacientes
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS categoria_tarifa VARCHAR DEFAULT 'particular_vigente';

-- Actualizar a Gladys San Juan a tarifa_antigua
UPDATE pacientes
SET categoria_tarifa = 'tarifa_antigua'
WHERE nombre_completo ILIKE '%Gladys San Juan%';
