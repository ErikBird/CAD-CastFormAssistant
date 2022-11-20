import { expose } from "comlink";
import { CSG_Tools } from "./worker_csg_tools.js";

// expose the CSG_Tools "API" with Comlink
expose(CSG_Tools);