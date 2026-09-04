INSERT INTO "AudienceSegment" ("id", "tab", "label", "value", "ordem")
SELECT
  gen_random_uuid()::text,
  source."tab"::"AudienceTab",
  source."label",
  0,
  source."ordem"
FROM (
  VALUES
    ('CARGO', 'Marketing & Comunicação', 0),
    ('CARGO', 'Engenharia & Tecnologia', 1),
    ('CARGO', 'Vendas & Negócios', 2),
    ('CARGO', 'Liderança (C-Level, VP)', 3),
    ('CARGO', 'RH & Gestão de Pessoas', 4),
    ('CARGO', 'Financeiro', 5),
    ('CARGO', 'Outros', 6),
    ('SENIORIDADE', 'Pleno', 0),
    ('SENIORIDADE', 'Sênior', 1),
    ('SENIORIDADE', 'Gerência', 2),
    ('SENIORIDADE', 'Diretoria', 3),
    ('SENIORIDADE', 'C-Level', 4),
    ('SENIORIDADE', 'Júnior', 5),
    ('SETOR', 'Tecnologia', 0),
    ('SETOR', 'Serviços profissionais', 1),
    ('SETOR', 'Educação', 2),
    ('SETOR', 'Varejo', 3),
    ('SETOR', 'Indústria', 4),
    ('SETOR', 'Outros', 5),
    ('LOCALIZACAO', 'São Paulo', 0),
    ('LOCALIZACAO', 'Recife', 1),
    ('LOCALIZACAO', 'Rio de Janeiro', 2),
    ('LOCALIZACAO', 'Belo Horizonte', 3),
    ('LOCALIZACAO', 'Curitiba', 4),
    ('LOCALIZACAO', 'Outros', 5)
) AS source("tab", "label", "ordem")
ON CONFLICT ("tab", "label") DO NOTHING;
