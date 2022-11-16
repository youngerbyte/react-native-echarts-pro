/**
 * Use webview and injectedJavaScript to render the echarts container.
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Platform, View } from "react-native";
import WebView from "react-native-webview";
import renderChart from "./renderChart";
import HtmlWeb from "../Utils/HtmlWeb";
import { stringify } from "../../util/toString";

function Echarts(props, ref) {
  const eChartRef = useRef();
  const [extensionScript, setExtensionScript] = useState("");
  const [instanceFlag] = useState(false);
  const [showContainer, setShowContainer] = useState(true);
  const [instanceResult, setInstanceResult] = useState({});
  const [fontFamiliesObject, setFontFamiliesObject] = useState({});
  const [eventArrays, setEventArrays] = useState([]);
  const latestCount = useRef(instanceFlag);
  const latestResult = useRef(instanceResult);
  /**
   * Export methods to parent.
   * Parent can use ref to call the methods.
   */
  useImperativeHandle(ref, () => ({
    setNewOption(option, optionSetting) {
      // See more info: https://echarts.apache.org/en/api.html#echartsInstance.setOption
      option.optionSetting = optionSetting;
      // eChartRef.current?.postMessage(JSON.stringify(option));
      eChartRef.current?.postMessage(stringify(option));
    },
    /**
     * 触发ECharts 中支持的图表行为
     * Chart actions supported by ECharts are triggered through dispatchAction.
     * @param {object|array} action
     */
    dispatchAction(action) {
      eChartRef.current?.postMessage(
        JSON.stringify({ type: "dispatchAction", action })
      );
    },
    /**
     * Get echarts instance support function.
     * @param {string} functionName
     * @param {object} params
     */
    async getInstance(functionName, params) {
      eChartRef.current?.postMessage(
        JSON.stringify({ type: "getInstance", functionName, params })
      );
      return await new Promise((resolve) => {
        const id = setInterval(() => {
          if (latestCount.current && latestResult.current[functionName]) {
            clearInterval(id);
            resolve(latestResult.current[functionName]);
          }
        }, 50);
      });
    },
  }));

  useEffect(() => {
    // eChartRef.current?.postMessage(JSON.stringify(props.option));
    eChartRef.current?.postMessage(stringify(props.option));
  }, [props.option]);

  /**
   * Customized fontFamily handle.
   * Concat fontType and fontFile strings.
   */
  useEffect(() => {
    let fontTypeString = "";
    let fontFamilyString = "";
    for (let tempFontFamily of props?.fontFamilies || []) {
      fontTypeString += `<div style="font-family: ${tempFontFamily.fontName};height:0px">&nbsp;</div>`;
      fontFamilyString += tempFontFamily.fontFile;
    }
    setFontFamiliesObject({
      fontTypeString,
      fontFamilyString,
    });
  }, [props.fontFamilies]);

  /**
   * Remove WebView after destruction.
   */
  useEffect(() => {
    return () => {
      setShowContainer(false);
    };
  }, []);

  /**
   * Capture the echarts event.
   * @param event echarts event in webview.
   */
  function onMessage(event) {
    const echartsData = JSON.parse(event.nativeEvent.data);
    // 判断监听类型
    if (echartsData.type === "datazoom") {
      props.onDataZoom?.();
    } else if (echartsData.type === "legendselectchanged") {
      props.legendSelectChanged?.(echartsData.name);
    } else if (echartsData.type === "tooltipEvent") {
      props.tooltipEvent?.(echartsData.params);
    } else if (echartsData.type === "getInstance") {
      const result = JSON.parse(event.nativeEvent.data);
      const tempInstanceResult = { ...instanceResult };
      // If value is unreadable, set to notDefined.
      if (!result.value) {
        result.value = "notDefined";
      }
      tempInstanceResult[result.functionName] = result.value;
      setInstanceResult(() => tempInstanceResult);
      latestResult.current = tempInstanceResult;
      latestCount.current = true;
    } else if (echartsData.type === "click") {
      props.onPress?.(JSON.parse(event.nativeEvent.data));
    } else {
      if (props.eventActions && props.eventActions[echartsData.type]) {
        props.eventActions[echartsData.type](echartsData);
      }
    }
  }

  /**
   * Support third-party extension.
   * extension: array
   */
  useEffect(() => {
    let result = ``;
    props.extension &&
      props.extension.map((res) => {
        if (res.indexOf("http") === 0) {
          result += `<script src="${res}"></script>`;
        } else {
          result += `<script>${res}</script>`;
        }
      });
    setExtensionScript(result);
  }, [props.extension]);

  /**
   * Support custom dynamic events.
   * eventActions: object
   */
  useEffect(() => {
    const eventArrays =
      (props.eventActions && Object.keys(props.eventActions)) || "[]";
    setEventArrays(eventArrays);
  }, [props.eventActions]);

  return (
    <View style={{ flex: 1, height: props.height || 400 }}>
      {showContainer && (
        <WebView
          androidHardwareAccelerationDisabled={true}
          textZoom={100}
          scrollEnabled={true}
          style={{
            height: props.height || 400,
            backgroundColor: props.backgroundColor || "transparent",
            opacity: 0.99,
          }}
          {...props.webViewSettings}
          ref={eChartRef}
          injectedJavaScript={renderChart({ ...props, eventArrays })}
          scalesPageToFit={Platform.OS !== "ios"}
          originWhitelist={["*"]}
          source={{ html: `${HtmlWeb(fontFamiliesObject)} ${extensionScript}` }}
          onMessage={onMessage}
        />
      )}
    </View>
  );
}

Echarts = forwardRef(Echarts);
export default Echarts;
