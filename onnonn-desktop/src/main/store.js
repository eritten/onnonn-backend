import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import sharedConfig from "../shared/config.json";

const { STORE_NAME } = sharedConfig;

function getStorePath() {
  return path.join(app.getPath("userData"), `${STORE_NAME}.json`);
}

function ensureStoreDirectory() {
  fs.mkdirSync(path.dirname(getStorePath()), { recursive: true });
}

function readStore() {
  try {
    const raw = fs.readFileSync(getStorePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    return {};
  }
}

function writeStore(nextState) {
  ensureStoreDirectory();
  fs.writeFileSync(getStorePath(), JSON.stringify(nextState, null, 2), "utf8");
}

function getValue(key, fallback = null) {
  const state = readStore();
  return key in state ? state[key] : fallback;
}

function setValue(key, value) {
  const state = readStore();
  state[key] = value;
  writeStore(state);
}

function deleteValue(key) {
  const state = readStore();
  delete state[key];
  writeStore(state);
}

export function getSession() {
  return getValue("session", null);
}

export function setSession(session) {
  setValue("session", session);
}

export function clearSession() {
  deleteValue("session");
}

export function getWindowState(key, fallback) {
  const windows = getValue("windows", {});
  return key in windows ? windows[key] : fallback;
}

export function setWindowState(key, value) {
  const windows = getValue("windows", {});
  windows[key] = value;
  setValue("windows", windows);
}
