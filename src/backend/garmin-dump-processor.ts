import { readdir, readFile, copyFile } from 'fs/promises'
import path from 'path'
import fitDecoder from 'fit-decoder'
import { DateTime } from 'luxon'

const sourceDir = '/Users/adam/Downloads/gamin\ backup\ ec14fc53-aa05-4899-b6f9-f6efd06088b5/DI_CONNECT/DI-Connect-Fitness-Uploaded-Files/UploadedFiles_0-_Part1'
// const sourceDir = '/Users/adam/Downloads/gamin\ backup\ ec14fc53-aa05-4899-b6f9-f6efd06088b5/DI_CONNECT/DI-Connect-Fitness-Uploaded-Files/small'
const destDir = '/Users/adam/Downloads/raw'

const extractSummary = async (filePath: string): Promise<{startTime: string, sport: string}> => {
    const file = await readFile(filePath)
    const buffer = file.buffer
  
    const jsonRaw = fitDecoder.fit2json(buffer)
    const json = fitDecoder.parseRecords(jsonRaw)

    // console.log(json.records[12]);
    // console.log(json.records[13])
    // console.log(json.records[14])
    
  
    const startTime = DateTime.fromJSDate(fitDecoder.getRecordFieldValue(json, 'session', 'start_time')[0])
    // const name = fitDecoder.getRecordFieldValue(json, 'sport', 'name')
    const sport = fitDecoder.getRecordFieldValue(json, 'sport', 'sport')[0]
    // const subSport = fitDecoder.getRecordFieldValue(json, 'sport', 'subSport')
  
    return {
        // startTime: startTime.toISO(),
        startTime: startTime.toFormat('y-LL-dd HHmmss ZZZ'),
        // name,
        sport,
        // subSport,
    }
}

const process = async () => {
    const allFilenames = await readdir(sourceDir)
    const runFilenames = allFilenames.filter((filename) => filename.toLowerCase().endsWith('.fit'))

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
        const filePath = path.join(sourceDir, filename)
        const summary = await extractSummary(filePath)
        const { startTime, sport } = summary
        

        if (sport === 'running') {
            const destPath = path.join(destDir, `${startTime}.fit`)
            await copyFile(filePath, destPath)
        }
        
        return summary
    }))
}

process()