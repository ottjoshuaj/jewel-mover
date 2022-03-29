const fs = require('fs').promises;
const fsEasy = require('fs');

export default class FSDatabase {
    public readDataFile<T>(className: string): T | null {
        try {
            const fileData = fsEasy.readFileSync(`${process.cwd()}/datafiles/${className}.json`, 'utf8');
            const parsedJson = JSON.parse(fileData);
            return JSON.parse(fileData) as T;
        } catch (e) {
            console.log({class: 'FSDatabase', method: 'readDataFile', error: e});
            return null;
        }
    }

    public writeDataFile<T>(className: string, dataObject: T): void {
        try {
            fsEasy.writeFileSync(`${process.cwd()}/datafiles/${className}.json`, JSON.stringify(dataObject));
        } catch (e) {
            console.log({class: 'FSDatabase', method: 'writeDataFile', error: e});
        }
    }
}