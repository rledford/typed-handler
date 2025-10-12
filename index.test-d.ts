import { expectType } from "tsd";
import { handler } from "./index.js";

const h = handler();

expectType<typeof h>(h);
