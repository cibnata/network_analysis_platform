import React, { createContext, useCallback, useContext, useState } from "react";

export interface EdgeData {
  source: string;
  target: string;
  weight?: number;
  label?: string;
  [key: string]: unknown;
}

export interface NodeData {
  id: string;
  label?: string;
  [key: string]: unknown;
}

export interface CommunityResult {
  nodeId: string;
  communityId: number;
}

export interface PredictionResult {
  source: string;
  target: string;
  score: number;
  type: "add" | "remove";
}

export interface NetworkState {
  // Raw imported data
  rawData: Record<string, unknown>[];
  rawHeaders: string[];
  fileName: string;

  // Edge data
  edges: EdgeData[];
  sourceColumn: string;
  targetColumn: string;

  // Graph properties
  graphDirected: boolean; // true = directed, false = undirected
  graphWeighted: boolean; // true = weighted, false = unweighted
  weightColumn: string; // column name used as weight (empty if unweighted)
  edgeLabelColumn: string; // column name used as edge label (empty if unused)

  // Node data
  nodes: NodeData[];
  nodeAttributes: string[];
  selectedAttribute: string;
  customLabels: Record<string, string>;

  // Node CSV import
  nodeCSV: NodeData[];
  nodeCSVHeaders: string[];
  nodeIdColumn: string;
  nodeLabelColumn: string; // column used as node display label (empty = use node id)

  // Community detection
  communityResults: CommunityResult[];
  communityAlgorithm: string;

  // Prediction
  predictionResults: PredictionResult[];

  // UI state
  currentStep: number;
}

interface NetworkContextType {
  state: NetworkState;
  setRawData: (data: Record<string, unknown>[], headers: string[], fileName: string) => void;
  setEdges: (
    edges: EdgeData[],
    source: string,
    target: string,
    directed: boolean,
    weighted: boolean,
    weightColumn: string,
    edgeLabelColumn?: string
  ) => void;
  setNodes: (nodes: NodeData[]) => void;
  setNodeCSV: (nodes: NodeData[], headers: string[], idColumn: string) => void;
  setSelectedAttribute: (attr: string) => void;
  setCustomLabel: (nodeId: string, label: string) => void;
  setCommunityResults: (results: CommunityResult[], algorithm: string) => void;
  setPredictionResults: (results: PredictionResult[]) => void;
  setCurrentStep: (step: number) => void;
  setGraphProperties: (directed: boolean, weighted: boolean, weightColumn: string) => void;
  setNodeLabelColumn: (col: string) => void;
  resetAll: () => void;
}

const defaultState: NetworkState = {
  rawData: [],
  rawHeaders: [],
  fileName: "",
  edges: [],
  sourceColumn: "",
  targetColumn: "",
  graphDirected: false,
  graphWeighted: false,
  weightColumn: "",
  edgeLabelColumn: "",
  nodes: [],
  nodeAttributes: [],
  selectedAttribute: "",
  customLabels: {},
  nodeCSV: [],
  nodeCSVHeaders: [],
  nodeIdColumn: "",
  nodeLabelColumn: "",
  communityResults: [],
  communityAlgorithm: "",
  predictionResults: [],
  currentStep: 1,
};

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(defaultState);

  const setRawData = useCallback((data: Record<string, unknown>[], headers: string[], fileName: string) => {
    setState((s) => ({ ...s, rawData: data, rawHeaders: headers, fileName }));
  }, []);

  const setEdges = useCallback(
    (
      edges: EdgeData[],
      source: string,
      target: string,
      directed: boolean,
      weighted: boolean,
      weightColumn: string,
      edgeLabelColumn = ""
    ) => {
      // Auto-generate nodes from edges
      const nodeSet = new Set<string>();
      edges.forEach((e) => {
        nodeSet.add(String(e.source));
        nodeSet.add(String(e.target));
      });

      const nodes: NodeData[] = Array.from(nodeSet).map((id) => ({ id, label: id }));

      setState((s) => ({
        ...s,
        edges,
        sourceColumn: source,
        targetColumn: target,
        graphDirected: directed,
        graphWeighted: weighted,
        weightColumn,
        edgeLabelColumn,
        nodes,
        nodeAttributes: [],
        communityResults: [],
        predictionResults: [],
      }));
    },
    []
  );

  const setNodes = useCallback((nodes: NodeData[]) => {
    setState((s) => ({ ...s, nodes }));
  }, []);

  const setNodeCSV = useCallback((nodes: NodeData[], headers: string[], idColumn: string) => {
    const attrHeaders = headers.filter((h) => h !== idColumn);

    setState((s) => {
      const nodeMap = new Map<string, NodeData>();
      s.nodes.forEach((n) => nodeMap.set(n.id, { ...n }));

      nodes.forEach((csvNode) => {
        const id = String(csvNode[idColumn] ?? "");
        if (!id) return;

        if (nodeMap.has(id)) {
          nodeMap.set(id, { ...nodeMap.get(id)!, ...csvNode, id });
        } else {
          nodeMap.set(id, { ...csvNode, id, label: id });
        }
      });

      return {
        ...s,
        nodeCSV: nodes,
        nodeCSVHeaders: headers,
        nodeIdColumn: idColumn,
        nodes: Array.from(nodeMap.values()),
        nodeAttributes: attrHeaders,
        selectedAttribute: attrHeaders[0] || "",
      };
    });
  }, []);

  const setSelectedAttribute = useCallback((attr: string) => {
    setState((s) => ({ ...s, selectedAttribute: attr }));
  }, []);

  const setCustomLabel = useCallback((nodeId: string, label: string) => {
    setState((s) => ({ ...s, customLabels: { ...s.customLabels, [nodeId]: label } }));
  }, []);

  const setCommunityResults = useCallback((results: CommunityResult[], algorithm: string) => {
    setState((s) => ({ ...s, communityResults: results, communityAlgorithm: algorithm }));
  }, []);

  const setPredictionResults = useCallback((results: PredictionResult[]) => {
    setState((s) => ({ ...s, predictionResults: results }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const setGraphProperties = useCallback((directed: boolean, weighted: boolean, weightColumn: string) => {
    setState((s) => ({ ...s, graphDirected: directed, graphWeighted: weighted, weightColumn }));
  }, []);

  const setNodeLabelColumn = useCallback((col: string) => {
    setState((s) => ({
      ...s,
      nodeLabelColumn: col,
      // Clear customLabels so the new label column takes effect immediately
      customLabels: {},
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        state,
        setRawData,
        setEdges,
        setNodes,
        setNodeCSV,
        setSelectedAttribute,
        setCustomLabel,
        setCommunityResults,
        setPredictionResults,
        setCurrentStep,
        setGraphProperties,
        setNodeLabelColumn,
        resetAll,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}

