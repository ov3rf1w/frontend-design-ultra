#!/usr/bin/env node

import process from "node:process";

import { runCli } from "../frontend-design-ultra/scripts/scan-reference.mjs";

await runCli(process.argv.slice(2));
