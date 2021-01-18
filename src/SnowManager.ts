import { APIClient } from 'APIClient';

import { QueryResponse } from './types';

import * as utils from './Utils';

export class SNOWManager {
  apiClient: APIClient;
  apiPath: string;

  constructor(options) {
    const { basicAuth, withCredentials, url } = options;
    this.apiPath = '';
    let headers = { 'Content-Type': 'application/json' };
    if (typeof basicAuth === 'string' && basicAuth.length > 0) {
      headers['Authorization'] = basicAuth;
    }
    this.apiClient = new APIClient(headers, withCredentials, url);
  }
  getCIs(filter: string, serviceName: string) {
    let cisURL = this.apiPath + '/search';
    let bodyData = '';
    let target = serviceName;

    if (serviceName !== '') {
      cisURL = this.apiPath + '/search/cis';
      bodyData = '{"targets":[{"target":"' + target + '","filter":"' + filter + '"}]}';
    }

    return this.apiClient
      .request({
        url: cisURL,
        data: bodyData,
        method: 'POST',
      })
      .then(this.apiClient.mapToTextValue);
  }

  getServices(filter: string) {
    let option = '';
    let bodyData = '{"targets":[{"filter":"' + filter + '","option":"' + option + '"}]}';
    if (utils.debugLevel() === 1) {
      console.log('get Services API');
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: this.apiPath + '/search/services',
        data: bodyData,
        method: 'POST',
      })
      .then(this.apiClient.mapToTextValue);
  }
  getMetricsFrames(target, timeFrom, timeTo, options) {
    return this.getMetrics(target, timeFrom, timeTo, options);
  }
  getMetrics(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log('isnide getMetrics');
      console.log('print target');
      console.log(target);
      console.log('print options scoped Vars');
      console.log(options.scopedVars);
    }

    const sourceTarget = utils.replaceTargetUsingTemplVars(target.source, options.scopedVars);
    const resourceNameTarget = utils.replaceTargetUsingTemplVars(target.metricType, options.scopedVars);
    const metricNameTarget = utils.replaceTargetUsingTemplVars(target.metricName, options.scopedVars);

    //let queryTarget = "EC2AMAZ-8AMDGC0";
    //let queryMetricName = "api_response_time_ms_2";
    let bodyData =
      '{"targets":[{"target":"' +
      sourceTarget +
      '","resourceName":"' +
      resourceNameTarget +
      '","metricName":"' +
      metricNameTarget +
      '"}]}';
    let metricURL = this.apiPath + '/query/ci_single_metric?startTime=' + timeFrom + '&endTime=' + timeTo;
    if (metricNameTarget === '*') {
      metricURL = this.apiPath + '/query/metrics?startTime=' + timeFrom + '&endTime=' + timeTo;
    }
    //return this.getTextFrames(target, timeFrom, timeTo, options,'Metrics');
    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(sourceTarget);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: metricURL,
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        return this.apiClient.mapMetricsResponseToFrame(response, target);
      });
  }

  getTextFrames(target, timeFrom, timeTo, options, type) {
    if (type === 'Alerts') {
      return this.getAlerts(target, timeFrom, timeTo, options);
    }
    if (type === 'Metrics') {
      return this.getAllMetrics(target, timeFrom, timeTo, options);
    }
    if (type === 'Admin') {
      if (target.selectedAdminCategoryList.value === 'Metrics Definition') {
        return this.getMetricsDefinition(target, timeFrom, timeTo, options);
      }
      return [];
    }
    return [];
  }

  getTopologyFrame(target, timeFrom, timeTo, options) {
    return this.getTopology(target, timeFrom, timeTo, options).then(response => {
      console.log(response);
      const data: QueryResponse[] = [
        {
          columns: [
            { text: 'type' },
            { type: 'time', text: 'Time' },
            { text: 'app' },
            { text: 'target_app' },
            { text: 'req_rate' },
          ],

          rows: response,
          refId: undefined,
          meta: undefined,
        },
      ];
      utils.printDebug(data);
      return { data };
    });
  }
  getTopology(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log('isnide get Topology');
      console.log('print target');
      console.log(target);
      console.log('print options scoped Vars');
      console.log(options.scopedVars);
    }

    const serviceTarget = utils.replaceTargetUsingTemplVars(target.service, options.scopedVars);
    let classesTarget = utils.replaceTargetUsingTemplVars(target.source, options.scopedVars);

    if (classesTarget === '$class' || classesTarget === '') {
      classesTarget = 'Linux Server, AppDynamics Tier,Application,MySQL Instance';
    }

    let bodyData = '{"targets":[{"target":"' + serviceTarget + '","classes":"' + classesTarget + '"}]}';

    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(serviceTarget);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: this.apiPath + '/query/topology?startTime=' + timeFrom + '&endTime=' + timeTo,
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        utils.printDebug('print altopology response from SNOW');
        utils.printDebug(response);
        utils.printDebug('~~~~~~~~~~~~~~~~');

        utils.printDebug(response.data);
        utils.printDebug('~~~~~~~~~~~~~~~~');
        return response.data.rows;
      });
  }
  getMetricsDefinition(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log('isnide getMetricsDefinition');
      console.log('print target');
      console.log(target);
      console.log('print options scoped Vars');
      console.log(options.scopedVars);
    }

    const sysparam_query = utils.replaceTargetUsingTemplVars(target.sysparam_query, options.scopedVars);
    let metricNameTarget = '';

    let bodyData = '{"targets":[{"target":"' + sysparam_query + '","metricName":"' + metricNameTarget + '"}]}';

    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(sysparam_query);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: this.apiPath + '/query/metrics_mapping?startTime=' + timeFrom + '&endTime=' + timeTo,
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        utils.printDebug('print getMetricsDefinition response from SNOW');
        utils.printDebug(response);
        return this.apiClient.mapTextResponseToFrame(response, target);
      });
  }
  getAlerts(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log('isnide GetAlerts');
      console.log('print target');
      console.log(target);
      console.log('print options scoped Vars');
      console.log(options.scopedVars);
    }
    const serviceTarget = utils.replaceTargetUsingTemplVars(target.service, options.scopedVars);
    const sourceTarget = utils.replaceTargetUsingTemplVars(target.source, options.scopedVars);
    let bodyTarget = serviceTarget;
    let alertState = 'Active';
    let alertType = 'service';
    if (target.selectedAlertStateList) {
      if (target.selectedAlertStateList.value === 'All') {
        alertState = 'All';
      }
    }
    if (target.selectedAlertTypeList) {
      if (target.selectedAlertTypeList.value === 'CI') {
        alertType = 'ci';
        bodyTarget = sourceTarget;
      }
    }

    let metricNameTarget = '';

    let bodyData = '{"targets":[{"target":"' + bodyTarget + '","metricName":"' + metricNameTarget + '"}]}';

    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(serviceTarget);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url:
          this.apiPath +
          '/query/alerts?startTime=' +
          +timeFrom +
          '&endTime=' +
          timeTo +
          '&alertState=' +
          alertState +
          '&alertType=' +
          alertType,
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        utils.printDebug('print alerts response from SNOW');
        utils.printDebug(response);
        return this.apiClient.mapTextResponseToFrame(response, target);
      });
  }

  getAllMetrics(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log('isnide GetAllMetrics');
      console.log('print target');
      console.log(target);
      console.log('print options scoped Vars');
      console.log(options.scopedVars);
    }

    const sourceTarget = utils.replaceTargetUsingTemplVars(target.source, options.scopedVars);
    let bodyTarget = sourceTarget;

    let metricNameTarget = '*';

    let bodyData = '{"targets":[{"target":"' + bodyTarget + '","metricName":"' + metricNameTarget + '"}]}';

    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: this.apiPath + '/query?startTime=' + +timeFrom + '&endTime=' + timeTo,
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        utils.printDebug('print alerts response from SNOW');
        utils.printDebug(response);
        return this.apiClient.mapTextResponseToFrame(response, target);
      });
  }
  getTopologyCISummary(ciName) {
    let bodyData = '{"targets":[{"target":"' + ciName + '"}]}';

    if (utils.debugLevel() === 1) {
      console.log('source after replace');
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url: this.apiPath + '/query/ci_summary',
        data: bodyData,
        method: 'POST',
      })
      .then(response => {
        utils.printDebug('print alerts response from SNOW');
        utils.printDebug(response);
        return response.data;
      });
  }

  getCategoryQueryOption() {
    let queryOptions = [
      {
        label: 'Metrics',
        value: 'Metrics',
        description: 'Get Timeseries metrics',
      },
      {
        label: 'Alerts',
        value: 'Alerts',
        description: 'Get Alert',
      },
      {
        label: 'Topology',
        value: 'Topology',
        description: 'Get Topology',
      },
      {
        label: 'Admin',
        value: 'Admin',
        description: 'Definitions and Admin Queries',
      },
    ];
    return queryOptions;
  }

  getAlertStateOptions() {
    let queryOptions = [
      {
        label: 'Active',
        value: 'Active',
        description: 'Get Open and Reopen Alerts',
      },
      {
        label: 'All',
        value: 'All',
        description: 'Get All alerts Open,Reopen, and Closed',
      },
    ];
    return queryOptions;
  }

  getAlertTypeOptions() {
    let queryOptions = [
      {
        label: 'CI',
        value: 'CI',
        description: 'Get Alerts at the CI level',
      },
      {
        label: 'Service',
        value: 'Service',
        description: 'Get Alerts at the Service level',
      },
    ];
    return queryOptions;
  }
  getAdminQueryOptions() {
    let queryOptions = [
      {
        label: 'Metrics Definition',
        value: 'Metrics Definition',
        description: '',
      },
    ];
    return queryOptions;
  }
}
