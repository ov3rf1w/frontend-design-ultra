#!/usr/bin/env node

import process from "node:process";
import { runCli } from "../frontend-design-ultra/scripts/query-design-intelligence.mjs";

await runCli(process.argv.slice(2));
