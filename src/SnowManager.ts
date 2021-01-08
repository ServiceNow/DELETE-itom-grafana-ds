import {
  ArrayVector,
  DataFrame,
  DataQuery,
  Field,
  FieldType,
  MutableDataFrame,
  TIME_SERIES_TIME_FIELD_NAME,
  TIME_SERIES_VALUE_FIELD_NAME
} from "@grafana/data";
import { APIClient } from "APIClient";
import { ServiceNowResult } from "./ServiceNowResult";
import { BackendSrv, getTemplateSrv } from "@grafana/runtime";

import {
  QueryResponse
} from "./types";

import * as utils from "./Utils";

export class SNOWManager {
  apiClient: APIClient;
  apiPath: string;

  constructor(options) {
    const { basicAuth, withCredentials, url } = options;
    this.apiPath = "";
    let headers = { "Content-Type": "application/json" };
    if (typeof basicAuth === "string" && basicAuth.length > 0) {
      headers["Authorization"] = basicAuth;
    }
    this.apiClient = new APIClient(headers, withCredentials, url);
  }
  getCIs(filter: string) {
    return this.apiClient
      .request({
        url: this.apiPath + "/search",
        data: "",
        method: "POST"
      })
      .then(this.apiClient.mapToTextValue);
  }
  getServices(filter: string) {
    return this.apiClient
      .request({
        url: this.apiPath + "/search/services",
        data: "",
        method: "POST"
      })
      .then(this.apiClient.mapToTextValue);
  }
  getMetricsFrames(target, timeFrom, timeTo, options) {
    return this.getMetrics(target, timeFrom, timeTo, options);
  }
  getMetrics(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log("isnide getMetrics");
      console.log("print target");
      console.log(target);
      console.log("print options scoped Vars");
      console.log(options.scopedVars);
    }

    const sourceTarget = utils.replaceTargetUsingTemplVars(
      target.source,
      options.scopedVars
    );
    const metricNameTarget = utils.replaceTargetUsingTemplVars(
      target.metricName,
      options.scopedVars
    );
    //let queryTarget = "EC2AMAZ-8AMDGC0";
    //let queryMetricName = "api_response_time_ms_2";
    let bodyData =
      '{"targets":[{"target":"' +
      sourceTarget +
      '","metricName":"' +
      metricNameTarget +
      '"}]}';

    if (utils.debugLevel() === 1) {
      console.log("source after replace");
      console.log(sourceTarget);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url:
          this.apiPath +
          "/query/ci_single_metric?startTime="+timeFrom+"&endTime="+timeTo,
        data: bodyData,
        method: "POST"
      })
      .then(response => {
        return this.apiClient.mapMetricsResponseToFrame(response, target);
      });
  }

  getTextFrames(target, timeFrom, timeTo, options,type) {
    if(type==="Alerts")
      return this.getAlerts(target, timeFrom, timeTo, options);
    return [];
  }
  getTopology() {
    // Return a constant for each query.
    const data: QueryResponse[] = [
    
      {
          columns: [
              { type: "time", text: "Time" },
              { text: "app" },
              { text: "target_app" },
              { text: "req_rate" }
          ],
          rows: [
              [0, "Stock Trader Online", "ProductService", -1, -1],
              [0, "Stock Trader Online", "Inventory", -1, -1],
              [0, "Stock Trader Online", "Payment", -1, -1],
              [0, "Stock Trader Online", "Purchase", -1, -1],
              [0, "Stock Trader Online", "CustomerService", -1, -1],
              [0, "ProductService", "product-docker-node", -1, -1],
              [0, "Inventory", "inventory-docker-node", 1, -1],
              [0, "Payment", "payment-docker-node", -1, -1],
              [0, "Purchase", "purchase-docker-node", 1, -1],
              [0, "CustomerService", "customer-docker-node", 1, -1]
          ],
          refId: undefined,
          meta: undefined,
      }
      /*,
      {
        columns: [
          { type: "time", text: "Time"},
          { text: "app" },
          { text: "target_app" },
          { text: "error_rate" }
        ],
        refId: undefined,
        meta: undefined,
        rows: [
          [0, "service a java", "service b http", 5],
          [0, "service a java", "service c java", 0],
          [0, "service c java", "service d http", 1]
        ]
      }
      */
      
    ]
    utils.printDebug(data);
    return { data };
  }
  getAlerts(target, timeFrom, timeTo, options) {
    if (utils.debugLevel() === 1) {
      console.log("isnide GetAlerts");
      console.log("print target");
      console.log(target);
      console.log("print options scoped Vars");
      console.log(options.scopedVars);
    }

    const serviceTarget = utils.replaceTargetUsingTemplVars(
      target.service,
      options.scopedVars
    );
    let metricNameTarget="";
  
    
    let bodyData =
      '{"targets":[{"target":"' +
      serviceTarget +
      '","metricName":"' +
      metricNameTarget +
      '"}]}';

    if (utils.debugLevel() === 1) {
      console.log("source after replace");
      console.log(serviceTarget);
      console.log(bodyData);
    }
    return this.apiClient
      .request({
        url:
          this.apiPath +
          "/query/alerts?startTime="+timeFrom+"&endTime="+timeTo,
        data: bodyData,
        method: "POST"
      })
      .then(response => {
        utils.printDebug("print alerts response from SNOW");
        utils.printDebug(response);
        return this.apiClient.mapTextResponseToFrame(response, target);
      });
  }
}
