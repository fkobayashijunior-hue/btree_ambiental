import { z } from 'zod';

// A placa da carreta não substitui a placa do veículo. Ausente preserva o
// cadastro em edições parciais; null ou campo vazio permitem remover o vínculo.
export const trailerPlateInput = z.string()
  .trim()
  .toUpperCase()
  .max(8, 'A placa da carreta deve ter no máximo 8 caracteres.')
  .regex(/^(?:[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2})?$/, 'Informe a placa da carreta como ABC-1234 ou ABC1D23.')
  .transform(value => value || null)
  .nullish();
