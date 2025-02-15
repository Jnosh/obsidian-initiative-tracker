import { TFile } from "obsidian";
import type InitiativeTracker from "./main";
import type { Creature } from "./utils/creature";
import type TrackerView from "./view";

export interface LogState {
    name?: string;
    players: Creature[];
    creatures: Creature[];
    xp: number;
    round: number;
}

export default class Logger {
    public async setLogFile(logFile: string) {
        this.logFile = logFile;
        this.logging = true;

        await this.setFile();
    }
    public getLogFile() {
        return this.logFile;
    }
    private logFile: string;
    async setFile() {
        const file = (await this.adapter.exists(this.logFile))
            ? await this.vault.getAbstractFileByPath(this.logFile)
            : await this.vault.create(this.logFile, ``);

        if (file instanceof TFile) {
            this.file = file;
        }
    }
    getFile(): TFile {
        return this.file;
    }
    private file: TFile;
    constructor(public plugin: InitiativeTracker, public view: TrackerView) {}
    get enabled() {
        return this.plugin.data.logging;
    }
    get folder() {
        return this.plugin.data.logFolder;
    }
    get vault() {
        return this.plugin.app.vault;
    }
    get adapter() {
        return this.plugin.app.vault.adapter;
    }
    logging = false;
    async new(logFile: string): Promise<void>;
    async new(state: LogState): Promise<void>;
    async new(param: string | LogState) {
        if (!this.enabled) return;

        if (typeof param == "string") {
            await this.setLogFile(param);
        } else {
            await this.setLogFile(
                `${this.folder}/${Date.now()} - ${param.name ?? "Combat"}.md`
            );
            await this.log(
                `**Combat started ${new Date().toLocaleString()}**\n\n`
            );
            await this.log("## Players");
            await this.log("| Player | Initiative | HP | Statuses |");
            await this.log("| --- | :-: | :-: | :-: |");
            for (const player of param.players.sort(
                (a, b) => b.initiative - a.initiative
            )) {
                await this.log(
                    "|",
                    player.name.replace("|", "|"),
                    "|",
                    player.initiative.toString(),
                    "|",
                    player.hp ? `${player.hp}/${player.max}` : "-",
                    "|",
                    [...(player.status.size ? player.status : ["-"])]
                        .join(", ")
                        .replace("|", "|"),
                    "|"
                );
            }
            await this.log("## Creatures");
            await this.log("| Creature | Initiative  | HP | Statuses |");
            await this.log("| --- | :-: | :-: | :-: |");
            for (const creature of param.creatures.sort(
                (a, b) => b.initiative - a.initiative
            )) {
                await this.log(
                    "|",
                    creature.name.replace("|", "|"),
                    "|",
                    creature.initiative.toString(),
                    "|",
                    creature.hp ? `${creature.hp}/${creature.max}` : "-",
                    "|",
                    [...(creature.status.size ? creature.status : ["-"])]
                        .join(", ")
                        .replace("|", "|"),
                    "|"
                );
            }

            await this.log("\n\n## Combat Log");
            await this.log("\n### Round 1");
            await this.log(`\n##### ${this.view.ordered[0].name}'s turn`);
        }
    }
    async log(...msg: string[]) {
        if (!this.file) return;
        if (!(await this.adapter.exists(this.logFile))) {
            await this.setLogFile(this.logFile);
        }
        await this.vault.append(this.file, `${msg.join(" ")}\n`);
    }
    public join(strings: string[], joiner: string = "and") {
        if (strings.length == 1) {
            return strings[0];
        }
        return `${strings.slice(0, -1).join(", ")} ${joiner} ${strings.slice(
            -1
        )}`;
    }
}
