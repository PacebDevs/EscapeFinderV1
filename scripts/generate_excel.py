#!/usr/bin/env python3
"""
Generador de plantilla Excel a partir de src/data/mapping_salas.json
Genera: output/salas_template.xlsx
Requiere: openpyxl
"""
import json
import os
from pathlib import Path
from datetime import datetime

try:
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter
except Exception as e:
    raise SystemExit("Falta openpyxl. Instálalo con: pip install -r requirements.txt")

ROOT = Path(__file__).resolve().parents[1]
MAPPING = ROOT / 'src' / 'data' / 'mapping_salas.json'
OUT_DIR = ROOT / 'output'
OUT_DIR.mkdir(exist_ok=True)
OUT_FILE = OUT_DIR / 'salas_template.xlsx'

with open(MAPPING, 'r', encoding='utf-8') as f:
    mapping = json.load(f)

wb = Workbook()
# remove default sheet
default = wb.active
wb.remove(default)

for sheet_name, sheet_spec in mapping.get('sheets', {}).items():
    ws = wb.create_sheet(title=sheet_name[:31])
    cols = sheet_spec.get('columns', {})

    # Header row
    headers = list(cols.keys())
    # Add auxiliary sample/example column at end
    headers.append('example')
    ws.append(headers)

    # Set column widths and add first sample row if we can create a reasonable example
    example_row = []
    for i, (col, spec) in enumerate(cols.items(), start=1):
        typ = spec.get('type')
        # set a reasonable width
        width = min(40, max(8, spec.get('maxLength', 20) if typ in ('string','text') else 12))
        ws.column_dimensions[get_column_letter(i)].width = width

        # create a simple example value depending on type
        ex = ''
        if typ in ('integer',):
            ex = 1 if col.endswith('id') or col.startswith('id_') else 2
        elif typ in ('float', 'decimal'):
            ex = '12.50'
        elif typ == 'boolean':
            ex = 'true'
        elif typ == 'enum':
            values = spec.get('values') or []
            ex = values[0] if values else ''
        else:
            ex = ''
        example_row.append(ex)

    # Add example in last col as JSON snippet of column notes
    example_row.append(json.dumps({c: mapping['sheets'][sheet_name]['columns'][c].get('notes', '') for c in cols.keys()}, ensure_ascii=False))

    # write one example row (but keep sheets mostly empty for real data)
    ws.append(example_row)

    # add a comment row under header describing scrape notes if any
    notes = sheet_spec.get('scrape_notes') or ''
    if isinstance(notes, list):
        notes = '\n'.join(notes)
    if notes:
        ws.append(['__NOTES__', notes])

# Add a meta sheet
meta = wb.create_sheet(title='_mapping_meta')
meta.append(['generated_at', datetime.utcnow().isoformat() + 'Z'])
meta.append(['source_mapping', str(MAPPING)])
meta.append(['description', mapping.get('meta', {}).get('description','')])

wb.save(OUT_FILE)
print('Generado:', OUT_FILE)
