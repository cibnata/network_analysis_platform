/*
 * Apply Edge Label field-selection support to network_analysis_platform.
 *
 * Usage from repo root:
 *   node tools/apply-edge-label-feature.cjs
 *
 * This script edits:
 *   client/src/pages/DataImport.tsx
 *   client/src/pages/NetworkVisualize.tsx
 * It also expects you to replace:
 *   client/src/contexts/NetworkContext.tsx
 * with the companion NetworkContext.tsx in this package.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataImportPath = path.join(root, 'client/src/pages/DataImport.tsx');
const visualizePath = path.join(root, 'client/src/pages/NetworkVisualize.tsx');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Could not find target for: ${label}`);
  return text.replace(from, to);
}
function replaceRegex(text, re, to, label) {
  if (!re.test(text)) throw new Error(`Could not find target for: ${label}`);
  return text.replace(re, to);
}

let data = read(dataImportPath);

if (!data.includes('edgeLabelCol')) {
  data = replaceOnce(
    data,
    '  const [weightCol, setWeightCol] = useState<string>("");\n',
    '  const [weightCol, setWeightCol] = useState<string>("");\n  const [edgeLabelCol, setEdgeLabelCol] = useState<string>("");\n',
    'add edgeLabelCol state'
  );

  data = data.replaceAll(
    'useState<{ source: string; target: string; weight?: number }[]>([])',
    'useState<{ source: string; target: string; weight?: number; label?: string }[]>([])'
  );

  data = replaceOnce(
    data,
    '        const autoSource = headers[0] ?? "";\n        const autoTarget = headers[1] ?? "";\n        const autoWeight = headers[2] ?? "";\n        setSourceCol(autoSource);\n        setTargetCol(autoTarget);\n        setWeightCol(autoWeight);\n',
    '        const autoSource = headers[0] ?? "";\n        const autoTarget = headers[1] ?? "";\n        const autoWeight = headers[2] ?? "";\n        const autoLabel =\n          headers.find((h) =>\n            [\n              "label",\n              "edge_label",\n              "edgeLabel",\n              "relation",\n              "relationship",\n              "type",\n              "關係",\n              "標籤",\n            ].includes(h)\n          ) ?? "";\n        setSourceCol(autoSource);\n        setTargetCol(autoTarget);\n        setWeightCol(autoWeight);\n        setEdgeLabelCol(autoLabel);\n',
    'auto-select edge label column'
  );

  data = replaceOnce(
    data,
    '        .map((row) => ({\n          source: String(row[sourceCol]),\n          target: String(row[targetCol]),\n          ...(weighted && weightCol ? { weight: parseFloat(String(row[weightCol] ?? "1")) || 1 } : {}),\n        }));\n',
    '        .map((row) => ({\n          source: String(row[sourceCol]),\n          target: String(row[targetCol]),\n          ...(weighted && weightCol ? { weight: parseFloat(String(row[weightCol] ?? "1")) || 1 } : {}),\n          ...(edgeLabelCol ? { label: String(row[edgeLabelCol] ?? "") } : {}),\n        }));\n',
    'generate edge labels'
  );

  data = replaceOnce(
    data,
    '      setEdges(edges, sourceCol, targetCol, directed, weighted, weighted ? weightCol : "");\n',
    '      setEdges(edges, sourceCol, targetCol, directed, weighted, weighted ? weightCol : "", edgeLabelCol);\n',
    'pass edgeLabelColumn to setEdges'
  );

  data = data.replace(
    '[sourceCol, targetCol, weightCol, directed, weighted, state.rawData, setEdges]',
    '[sourceCol, targetCol, weightCol, edgeLabelCol, directed, weighted, state.rawData, setEdges]'
  );

  const buttonNeedle = '<Button\n                onClick={handleGenerateEdges}';
  const buttonIndex = data.indexOf(buttonNeedle);
  if (buttonIndex === -1) throw new Error('Could not locate Generate Edge button');
  const edgeLabelSelectBlock = `
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Tag size={12} /> 邊標籤欄位 (Edge Label)
                </label>
                <Select value={edgeLabelCol || "__none__"} onValueChange={(v) => setEdgeLabelCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="可選：選擇邊標籤欄位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不使用邊標籤</SelectItem>
                    {state.rawHeaders
                      .filter((h) => h !== sourceCol && h !== targetCol && h !== weightCol)
                      .map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

`;
  data = data.slice(0, buttonIndex) + edgeLabelSelectBlock + data.slice(buttonIndex);

  data = data.replace(
    '          {state.graphWeighted ? `有權重（${state.weightColumn}）` : "無權重"}',
    '          {state.graphWeighted ? `有權重（${state.weightColumn}）` : "無權重"}\n          {state.edgeLabelColumn ? `邊標籤（${state.edgeLabelColumn}）` : "無邊標籤"}'
  );

  data = data.replace(
    '{state.graphWeighted && <th className="px-3 py-2 text-left font-medium">Weight</th>}',
    '{state.graphWeighted && <th className="px-3 py-2 text-left font-medium">Weight</th>}\n                        {state.edgeLabelColumn && <th className="px-3 py-2 text-left font-medium">Label</th>}'
  );

  data = data.replace(
    '{state.graphWeighted && <td className="px-3 py-2">{(e as { weight?: number }).weight ?? "—"}</td>}',
    '{state.graphWeighted && <td className="px-3 py-2">{(e as { weight?: number }).weight ?? "—"}</td>}\n                          {state.edgeLabelColumn && <td className="px-3 py-2">{String((e as { label?: string }).label ?? "—")}</td>}'
  );
}

write(dataImportPath, data);

let vis = read(visualizePath);

if (!vis.includes('const importedLabel =')) {
  vis = replaceOnce(
    vis,
    '      const edgeId = `e${i}`;\n      const edgeLabel = edgeCustomLabels[edgeId] ?? "";\n',
    '      const edgeId = `e${i}`;\n      const importedLabel =\n        typeof e.label === "string"\n          ? e.label\n          : state.edgeLabelColumn && e[state.edgeLabelColumn] !== undefined\n          ? String(e[state.edgeLabelColumn])\n          : "";\n      const edgeLabel = edgeCustomLabels[edgeId] ?? importedLabel;\n',
    'edge label fallback in buildElements'
  );

  vis = replaceOnce(
    vis,
    '    state.nodeLabelColumn, centralities, selectedCentrality,\n',
    '    state.nodeLabelColumn, state.edgeLabelColumn, centralities, selectedCentrality,\n',
    'add edgeLabelColumn dependency to buildElements'
  );

  vis = replaceOnce(
    vis,
    '    cyInstance.current.edges().forEach((edge) => {\n      const lbl = edgeCustomLabels[edge.id()] ?? "";\n      edge.data("label", lbl);\n    });\n',
    '    cyInstance.current.edges().forEach((edge) => {\n      const idx = Number(edge.id().replace(/^e/, ""));\n      const edgeData = state.edges[idx];\n      const importedLabel = edgeData\n        ? typeof edgeData.label === "string"\n          ? edgeData.label\n          : state.edgeLabelColumn && edgeData[state.edgeLabelColumn] !== undefined\n          ? String(edgeData[state.edgeLabelColumn])\n          : ""\n        : "";\n      const lbl = edgeCustomLabels[edge.id()] ?? importedLabel;\n      edge.data("label", lbl);\n    });\n',
    'edge label fallback in style update effect'
  );

  vis = vis.replace(
    '    customNodeColors, customNodeSizes,\n  ]);',
    '    customNodeColors, customNodeSizes,\n    state.edges, state.edgeLabelColumn,\n  ]);'
  );
}

write(visualizePath, vis);
console.log('Done. Edge Label column selection has been applied.');
