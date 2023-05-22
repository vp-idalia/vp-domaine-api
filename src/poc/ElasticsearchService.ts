import axios, { AxiosResponse } from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';
//import txt from "./body.txt";
import { ReliableTxtLines, ReliableTxtEncoder, ReliableTxtEncoding, ReliableTxtDecoder } from "@stenway/reliabletxt"
import { JsonContains } from 'typeorm';
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://127.0.01:15102' });


//const file = readFileSync(join(__dirname,'./body.txt'), 'utf-8');


 type ProjetDomainise = {
  id: number;
  objet_marche: string;
  pms: string[];
 };

 export class ElasticsearchService {
  private readonly baseURL: string;

 constructor(baseURL: string) {
 this.baseURL = baseURL;
 }


 async createIndex(indexName: string, settingsAndmappings: object): Promise<void> {
    try {
        await axios.put(`${this.baseURL}/${indexName}`, settingsAndmappings);
    } catch (error) {
        console.error('Error creating index:', error);
        throw error;
    }
 }

 async deleteIndex(indexName: string): Promise<void> {
    try {
        await axios.delete(`${this.baseURL}/${indexName}`);
    } catch (error) {
        console.error('Error deleting index:', error);
        throw error;
    }
 }

 async addData(indexName: string, data: ProjetDomainise[]): Promise<void> {
    //const body = readFileSync(join(__dirname, '../body.txt'), 'utf-8');
    //const body = fs.readFileSync('./body.txt', 'utf-8');
    //let body = ReliableTxtLines.split("Line 1\r\nLine 2\n");
    // let body1 = ReliableTxtLines.join([`{ "index" : { "_index" : "indexname", "_type" : "type1", "_id" : "111" }}`, `{ "Name" : "CHRIS","Age" : "23" ,"Gender" : "M"}`, ""]);
    // let body2 = ReliableTxtEncoder.encode(body1, ReliableTxtEncoding.Utf8);
    // let body = ReliableTxtDecoder.decode(body2);
    try { 
        // for (let i = 1; i <= Math.trunc((data.length/3))+1; i++) {
        //     console.log("slice");
        //     console.log(data.slice((i-1)*3,i*3));
        //     const body = Object.fromEntries(
        //                     Object.entries(data.slice((i-1)*3,i*3)).map(([key, val]) => [key, val]),
        //                 );
        //     await axios.post(`${this.baseURL}/${indexName}/_bulk`, body , { headers: { 'Content-Type': 'application/x-ndjson' } });
        // }
            const body = data.map(doc => [
                { index: { _index: indexName, _id: doc.id.toString() } },
                doc,
                ]).flat();
            const response = await client.bulk({ body });
            return response;
    } catch (error) {
        console.error('Error adding data:', error);
        throw error;
    }
 }

 async search(indexName: string, keywords: string): Promise<any> {
    try {
        const body = {
            query: {
                match: {
                    objet_marche: keywords,
                },
            },
        };
        const response = await axios.post(`${this.baseURL}/${indexName}/_search`, body);
        //return response.data.hits.hits.filter(h => h._score>15).map((hit: any) => hit._source); 
        return response.data.hits;
    } catch (error) {
        console.error('Error searching:', error);
        throw error;
    }
 }

 async getTokens(indexName: string, textContent: string): Promise<any> {
  try {
      const body = {
        analyzer : "rebuilt_french",
        text: textContent,
      };
      return await axios.post(`${this.baseURL}/${indexName}/_analyze`, body);
  } catch (error) {
      console.error('Error searching:', error);
      throw error;
  }
}

}
