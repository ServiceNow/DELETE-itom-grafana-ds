import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

export interface PluginQuery extends DataQuery {
  queryFilter: string;

  service: any;
  source: string;
  metricType: string;
  metricName: string;
  depends_on_toggle: string;
  sysparam_query: string;
  metricAnomaly: string;
  topology_child_depth: string;
  topology_parent_depth: string;
  topology_filter: string;
  tableName: string;
  tableColumns: string;
  topology_namespaces: string;
  topology_depends_on_toggle: boolean;
  live_osquery: string;

  selectedServiceList: SelectableValue<string>;
  selectedSourceList: SelectableValue<string>;
  selectedMetricNameList: SelectableValue<string>;
  selectedMetricTypeList: SelectableValue<string>;
  selectedAdminCategoryList: SelectableValue<string>;
  selectedAlertStateList: SelectableValue<string>;
  selectedAlertTypeList: SelectableValue<string>;
  selectedChangeTypeList: SelectableValue<string>;
  selectedMetricAnomalyList: SelectableValue<string>;
  selectedAgentFilter: SelectableValue<string>;

  selectedQueryCategory: SelectableValue<string>;
  selectedAgentFilterType: SelectableValue<string>;
}

export const defaultQuery: Partial<PluginQuery> = {
  service: '$service',
  source: '$source',
  metricName: '$metricName',
  metricType: '$metricType',
  selectedQueryCategory: {
    label: 'Metrics',
    value: 'Metrics',
    description: 'Get Timeseries metrics.',
  },
  depends_on_toggle: '$dependsOnFilter',
};

/**
 * These are options configured for each DataSource instance
 */
export interface PluginDataSourceOptions extends DataSourceJsonData {
  path?: string;
  resolution?: number;
  instanceName?: string;
  authInfo?: string;
  corsProxy?: string;
  username?: string;
  password?: string;
}

export interface CustomVariableQuery {
  namespace: string;
  rawQuery: string;
}

export interface ConfigEditOptions extends DataSourceJsonData {
  organization?: string;
  defaultBucket?: string;
  maxSeries?: number;
}

export interface ConfigEditSecureJsonData {
  token?: string;
}

export interface QueryResponseColumn {
  type?: string;
  text: string;
}

export interface QueryResponse {
  columns: QueryResponseColumn[];
  refId?: string;
  meta?: string;
  rows: any[];
}

export type Pair<T, K> = [T, K];
