import defaults from 'lodash/defaults';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import { MoogsoftAPIClient } from './MoogsoftAPIClient'
import { getTemplateSrv } from '@grafana/runtime';
import { MoogSoftAlert } from './MoogSoftAlert'
import { MoogSoftIncident } from './MoogsoftIncident'
import { MoogsoftMetric } from 'MoogsoftMetric';
//import { filter } from 'minimatch';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  resolution: number;
  instanceName: string;
  moogApiKey: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    console.log('Resolution : ' + instanceSettings.jsonData.resolution);
    this.resolution = instanceSettings.jsonData.resolution || 1000.0;
    this.instanceName = instanceSettings.jsonData.instanceName as string;
    this.moogApiKey = instanceSettings.jsonData.moogApiKey as string;
    console.log('this.resolution : ' + this.resolution);
    console.log('instanceSettings.jsonData.instanceName is :' + instanceSettings.jsonData.instanceName);
    console.log('instanceSettings.jsonData.apiKey : ' + instanceSettings.jsonData.moogApiKey);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    console.log("options : " + JSON.stringify(options));
    console.log("options.scopedVars : " + JSON.stringify(options.scopedVars));
    console.log("getTemplateSrv().getVariables : " + JSON.stringify(getTemplateSrv().getVariables()));
    const templateSrv = getTemplateSrv();
    const variablesProtected = templateSrv.getVariables();
    const variablesStringfied = JSON.stringify(variablesProtected);
    var variables: any = JSON.parse(variablesStringfied);
    var selectedServices: string[] = variables[0].current.value;

    console.log("variablesProtected : " + variablesProtected);
    console.log("variablesStringfied : " + variablesStringfied);
    console.log("selectedServices : " + selectedServices);
    //console.log('query text: ' + query.queryText);
    
    const { range } = options;
    const from = range.from.valueOf();
    const to = range.to.valueOf();
    let alertsFilter = ""
    let incidentFilter = "";

    if (options.targets[0].alertCategory.value === 'incidents') {
      incidentFilter = options.targets[0].queryFilter;
    } else {
      alertsFilter = options.targets[0].queryFilter;
    }
    console.log('From : ' + new Date(from));
    console.log('To   : ' + new Date(to));
    console.log('Filter : ' + options.targets[0].queryFilter);

    let client = new MoogsoftAPIClient();
    console.log('Before invoking API...');

    let allAlerts: MoogSoftAlert[] = await client.getAlerts(new Date(from), new Date(to), alertsFilter);
    let allIncidents: MoogSoftIncident[] = await client.getIncidents(new Date(from), new Date(to), incidentFilter);
    //let metrics: MoogsoftMetric[] = await client.getMetrics();
    let metrics: MoogsoftMetric[] =[];

    //filter alerets
    let alerts: MoogSoftAlert[] = [];
    if(!selectedServices.includes('$__all')) {
      alerts = allAlerts.filter(function (alert) {
        alert.services = alert.services.map(service => service.trim());
        return selectedServices.some(r => alert.services.indexOf(r.trim()) >= 0);
      });
    } else {
      alerts = allAlerts;
    }

    let incidents: MoogSoftIncident[] = [];
    if(!selectedServices.includes('$__all')) {
      incidents = allIncidents.filter(function (incident) {
        incident.services = incident.services.map(service => service.trim());
        return selectedServices.some(r => incident.services.indexOf(r.trim()) >= 0);
      });
    } else {
      incidents = allIncidents;
    }

    const data = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      console.log('query : ' + JSON.stringify(query));
      const frame = new MutableDataFrame({
        refId: query.refId,
        fields: [
        ],
      });

      //let queryType:string = query.queryText;
      let queryType: string = query.selectedQueryCategory.value as string;
      let alertCategory: string = query.alertCategory.value as string;
      let resultType: string = query.resultCategory.value as string;
      let aggregationType: string = query.aggregationCriteria.value as string;

      console.log("query in Datasource is : " + JSON.stringify(query));
      console.log("queryType is : " + queryType);
      console.log("alertCategory is : " + alertCategory);
      console.log("resultType is : " + resultType);
      console.log("aggregationType is : " + aggregationType);

      if (queryType === "Alerts") {
        //If query type is alert check its subtype it is incident or alerts
        if (alertCategory === 'incidents') {
          if (resultType === 'total') {
            frame.addField({ name: 'Total Incidents', type: FieldType.number, values: [allIncidents.length] });
          } else if(resultType === 'aggregate') {
            var occurences = incidents.reduce(function (r, incident) {
              if(aggregationType === 'status') {
              r[incident.status] = ++r[incident.status] || 1;
              } else if(aggregationType === 'severity') {
                r[incident.severity] = ++r[incident.severity] || 1;
                }
              return r;
            }, {});

            let aggregationResult = Object.keys(occurences).map(function (key) {
              return { key: key, value: occurences[key] };
            })
            console.log('aggregationResult : ' + JSON.stringify(aggregationResult));
            aggregationResult.forEach(element => {
              frame.addField({ name: element.key, type: FieldType.number, values: [element.value] });
            });
            
          } else if (resultType === 'all') {
            //We are listing all incidents as of now instead of aggregating
            let incidentIdList: number[] = [];
            let incidentDescriptionList: string[] = [];
            let incidentSeverityList: string[] = [];
            let incidentCreationTimeList: Date[] = [];
            let incidentStatusList: string[] = [];
            let incidentServiceList: string[] = [];
            let count: number = 0;

            console.log('Adding values');
            incidents.forEach(incident => {
              incidentIdList.push(incident.id);
              incidentDescriptionList.push(incident.description);
              incidentSeverityList.push(incident.severity);
              console.log('incident.creationTime : ' + incident.creationTime);
              var createUtcSeconds = incident.creationTime;
              var creationDate = new Date(0);
              creationDate.setUTCSeconds(createUtcSeconds);
              incidentCreationTimeList.push(creationDate  );
              incidentStatusList.push(incident.status);
              //incidentServiceList.push(incident.services);
              count++;
            });

            console.log('Total incidents are : ' + count);
            frame.addField({ name: 'Incident ID', type: FieldType.number, values: incidentIdList });
            frame.addField({ name: 'Severity', type: FieldType.string, values: incidentSeverityList });
            frame.addField({ name: 'Creation Time', type: FieldType.time, values: incidentCreationTimeList });
            frame.addField({ name: 'Status', type: FieldType.string, values: incidentStatusList });
            frame.addField({ name: 'Service', type: FieldType.string, values: incidentServiceList });
            frame.addField({ name: 'Description', type: FieldType.string, values: incidentDescriptionList });
          } else if (resultType === 'noiseReduction') {
            console.log('calculating reducedNoise');
            console.log('incidents.length : ' + allIncidents.length);
            console.log('alerts.length : ' + allAlerts.length);
            let reducedNoise:number = 0;
            reducedNoise = (allIncidents.length / allAlerts.length) * 100;
            //As we are calculating total incidents generated for the alerts we are doing 100 - reducedNoise
            reducedNoise = 100 - reducedNoise;
            console.log('reducedNoise : ' + reducedNoise);
            frame.addField({ name: 'Noise Reduction', type: FieldType.number, values: [reducedNoise] });
          } else if (resultType === 'mttr') {
            let totalMttr:number = 0;
            incidents.forEach(incident => {
              totalMttr = totalMttr + (incident.lastStateChange - incident.creationTime);
            });
            console.log('totalMttr : ' + totalMttr);
            let meanMttr = totalMttr / (incidents.length * 1000); //As its in miliseconds
            frame.addField({ name: 'MTTR', type: FieldType.number, values: [meanMttr] });
          } 
        } else {
          //Subtype is alerts
          console.log("Adding alerts as result..");
          if (resultType === 'aggregate') {
            /*
            let sourceAlerts: MoogSoftAlert[] = alerts.filter(function (alert) {
              return selectedServices.some(r => alert.services.indexOf(r) >= 0);
            });
            */
            //console.log("serviceAlerts : " + JSON.stringify(sourceAlerts));
            var occurenceResults = alerts.reduce(function (r, alert) {
              if (aggregationType === 'source' && alert.source) {
                r[alert.source] = ++r[alert.source] || 1;
              } else if (aggregationType === 'class' && alert.moogsoftClass) {
                r[alert.moogsoftClass] = ++r[alert.moogsoftClass] || 1;
              } else if (aggregationType === 'manager' && alert.manager) {
                r[alert.manager] = ++r[alert.manager] || 1;
              }
              return r;
            }, {});
            let sourceResults = Object.keys(occurenceResults).map(function (key) {
              return { key: key, value: occurenceResults[key] };
            });
            //console.log('sourceResults : ' + JSON.stringify(sourceResults));
            sourceResults.forEach(element => {
              frame.addField({ name: element.key, type: FieldType.number, values: [element.value] });
            });

            console.log('Frame is : ' + JSON.stringify(frame));
          } else if (resultType === 'total') {
            frame.addField({ name: 'Total Alerts', type: FieldType.number, values: [allAlerts.length] });
          } else {
            let alertIdList: number[] = [];
            let alertDescriptionList: string[] = [];
            let alertSeverityList: string[] = [];
            let alertCreationTimeList: Date[] = [];
            let alertSourceList: string[] = [];
            let alerLastEventTimeList: Date[] = [];
            let alertServiceList: string[] = [];
            let alertStatusList: string[] = [];


            alerts.forEach(alert => {
              alertIdList.push(alert.id);
              alertDescriptionList.push(alert.description);
              alertSeverityList.push(alert.severity);
              var createUtcSeconds = alert.creationTime;
              var creationDate = new Date(0);
              creationDate.setUTCSeconds(createUtcSeconds);
              alertCreationTimeList.push(creationDate);
              alertSourceList.push(alert.source);
              var lastUtcSeconds = alert.lastEventTime;
              var lastEventDate = new Date(0);
              lastEventDate.setUTCSeconds(lastUtcSeconds);
              alerLastEventTimeList.push(lastEventDate);
              alertServiceList.push(alert.service);
              alertStatusList.push(alert.status);
            });
            frame.addField({ name: 'Alert ID', type: FieldType.number, values: alertIdList });
            frame.addField({ name: 'Severity', type: FieldType.string, values: alertSeverityList });
            frame.addField({ name: 'Creation Time', type: FieldType.time, values: alertCreationTimeList });
            frame.addField({ name: 'Source', type: FieldType.string, values: alertSourceList });
            frame.addField({ name: 'Last Enent Time', type: FieldType.time, values: alerLastEventTimeList });
            frame.addField({ name: 'Description', type: FieldType.string, values: alertDescriptionList });
            frame.addField({ name: 'Service', type: FieldType.string, values: alertServiceList });
          }
        }
        return frame;
      } else if (queryType === "Geolocation Alerts") {
        let frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'country', type: FieldType.string },
            { name: 'latitude', type: FieldType.number },
            { name: 'longitude', type: FieldType.number },
            { name: 'metric', type: FieldType.number }
          ],
        });
        console.log("Adding location based alerts..");
        alerts.forEach((alert) => {
          const found = selectedServices.some(r => alert.services.indexOf(r) >= 0);
          const allFound = selectedServices.includes('$__all');
          if ((found === true || allFound === true) && typeof alert.country !== "undefined") {
            frame.add({ country: alert.country, latitude: alert.latitude, longitude: alert.longitude, metric: alert.metric });
          }
        });
        return frame;
      } else if (queryType === "Metrics") {
        /*
        Note: this is a dummy test data for the testing
        const { range } = options;
        const from = range!.from.valueOf();
        const to = range!.to.valueOf();
        let frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'Time', values: [from, to], type: FieldType.time },
            { name: 'CPU', values: [12, 21], type: FieldType.number },
            { name: 'Memory', values: [10, 20], type: FieldType.number },
            { name: 'Tet value', values: ['A', 'B'], type: FieldType.string }            
          ],
        });
        */

        let frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: 'value', type: FieldType.number }
          ],
        });
        console.log("Adding Metrics..");
        metrics.forEach((metric) => {
          console.log("metric is : " + JSON.stringify(metric));
          console.log("metric.data : " + metric.data);
          console.log("metric.time : " + new Date(metric.created_at_date));
          frame.add({ time: new Date(), value: metric.data });
        });
        return frame;
      }
      return frame;
    });
    return { data };
  }

  async testDatasource() {
    //Health check for the data source.
    console.log("Testing datasource");
    return {
      status: 'success',
      message: 'Successful check',
    };
  }
}
