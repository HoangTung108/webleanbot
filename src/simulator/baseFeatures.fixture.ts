import rawBase from '../../docs/baseCode.cpp?raw';
import {configureBaseFeatures,preprocessBaseFeatures,BASE_FEATURES} from './baseFeatures';
/** Full-feature fixture for tests that explicitly exercise optional hardware APIs. */
const configured=preprocessBaseFeatures(configureBaseFeatures(rawBase,BASE_FEATURES));
// Keep test credentials separate from the user's configuration.
export default configured
 .replace(/LbIoT\.Wifi\.begin\([^;\n]*\);/, 'LbIoT.Wifi.begin("test", "pass");')
 .replace(/LbIoT\.Asset\.begin\(F\("[^"\n]*"\)\);/, 'LbIoT.Asset.begin(F("ROOM"));');
