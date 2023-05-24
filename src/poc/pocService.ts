import { Inject, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ElasticsearchService } from './ElasticsearchService';
import { BilanTestDomainisationDto } from './bilanTestDomainisation.dto';
const {convertArrayToCSV} = require('convert-array-to-csv');
import * as fs from "fs";
import { readFile } from "xlsx";
import dateFormat from "dateformat";

const elasticsearchService = new ElasticsearchService('http://127.0.01:15102');

type ProjetDomainise = {
  id: number;
  date_modification: Date;
  objet_marche: string;
  pms: string[];
};

type InputObject = {
  id: number;
  date_modification: Date;
  objet_marche: string;
  pms: string;
};

@Injectable()
export class pocService {

  constructor(@InjectConnection() private readonly connection: Connection) {}
  
  initEsIndex(indexName: string) {
  
    const settingsAndmappings = {
      "settings": {
          "analysis": {
            "filter": {
              "french_elision": {
                "type":         "elision",
                "articles_case": true,
                "articles": [
                    "l", "m", "t", "qu", "n", "s",
                    "j", "d", "c", "jusqu", "quoiqu",
                    "lorsqu", "puisqu"
                  ]
              },
              "french_stop": {
                "type":       "stop",
                "stopwords":  "_french_" 
              },
              "french_keywords": {
                "type":       "keyword_marker",
                "keywords":   ["Example"] 
              },
              "french_stemmer": {
                "type":       "stemmer",
                "language":   "light_french"
              }
            },
            "analyzer": {
              "rebuilt_french": {
                "tokenizer":  "standard",
                "filter": [
                  "french_elision",
                  "lowercase",
                  "french_stop",
                  "french_keywords",
                  "french_stemmer"
                ]
              }
            }
          }
        },
        "mappings": {
          "properties": {
            "objet_marche": {
              "type": "text",
              "analyzer": "rebuilt_french",
              "search_analyzer": "rebuilt_french"
            }
          }
        }
    };

    const maRequette = "SELECT [id],[date_modification],[objet_marche],[pms] FROM [dbo].[IM_OBJET_PMS_6MONTH]";
      return this.connection.query(maRequette).then(rs => {
        const outputMap = rs.reduce((acc: Map<number, ProjetDomainise>, inputObj: InputObject) => {
        return this.createMapProjetDomainise(acc, inputObj);;
        }, new Map<number, ProjetDomainise>());

      elasticsearchService.deleteIndex(indexName);
      setTimeout(() => { elasticsearchService.createIndex(indexName, settingsAndmappings); }, 10);
      setTimeout(() => { elasticsearchService.addData(indexName, Array.from(outputMap.values())); }, 1000);
      //return Array.from(outputMap.values());
    });
  }

  createBilanTestDomainisation(nom: string) {
    const maRequette = "SELECT distinct top 1000 im.id, im.date_modification, imi.objet_marche, "
    +"UPPER(substring( pms.chemin_normalise, 0, IIF( CHARINDEX('/', pms.chemin_normalise, 2) = 0, "
    +"LEN(pms.chemin_normalise) + 1, CHARINDEX('/', pms.chemin_normalise, 2) ) )) as pms FROM [marche].[INFORMATION_MARCHE] "
    +"im inner join marche.INFORMATION_MARCHE_INDEX imi on imi.information_marche_id = im.id inner join qualification.ELEMENT_QUALIFICATION eqPMS "
    +"on (eqPMS.qualification_id = im.qualification_id and eqPMS.reference_code = 'indexation_triplet') inner join "
    +"qualification.VALEUR_INDEXATION_TRIPLET_INDEXATION viti on viti.valeur_indexation_id = eqPMS.valeur_indexation_id inner join "
    +"qualification.TRIPLET_INDEXATION ti on ti.id = viti.triplet_indexation_id inner join nomenclature.PRODUIT_METIER_SERVICE pms "
    +"on pms.code = ti.produit_metier_service_code WHERE im.date_modification between '20210101' and '20220116' and im.etat = 'fin-production' and nombre_lots = 0 ";

    return this.connection.query(maRequette).then( async rs => {
      const outputMap = rs.reduce((acc: Map<number, ProjetDomainise>, inputObj: InputObject) => {
      return this.createMapProjetDomainise(acc, inputObj);
      }, new Map<number, ProjetDomainise>());

      var tab: ProjetDomainise[] = Array.from(outputMap.values());

      var tabPromisesBilanTestDomainisation = Promise.all(tab.map(async (inputObj) => {
        return await this.createBilanTestDomainisationDto(inputObj)
      }))

      tabPromisesBilanTestDomainisation.then(b => {
        setTimeout(() => {
          this.generateXlsxFromArrayBilanTestDomainisationDto(b, nom);
        }, 1000);
      })

    //   var slicedTab=[];
    //   for (let i = 1; i <= Math.trunc((tab.length/75))+1; i++) {
    //     slicedTab.push(tab.slice((i-1)*75,i*75))
    //   }
    //   for (let i = 0; i < slicedTab.length; i++) {
    //   setTimeout(() => {
    //     slicedTab[i].forEach(async inputObj => {
    //       var objTokens = await getTokens("projet_domainises", inputObj.objet_marche).then( objTokens => {
    //         var tabTokens= [];
    //         for (let t of objTokens.data.tokens) {
    //           tabTokens.push(t.token);
    //         }
    //         console.log(tabTokens)
    //       });
    //     })
    //   }, 400000);
    //  }

    });
  }

  createMapProjetDomainise(acc: Map<number, ProjetDomainise>,inputObj: InputObject): Map<number, ProjetDomainise> {
    const existingObj = acc.get(inputObj.id);
      
      if (existingObj) {
        existingObj.pms.push(inputObj.pms);
      } else {
        const newObj: ProjetDomainise = {
        id: inputObj.id,
        date_modification: inputObj.date_modification,
        objet_marche: inputObj.objet_marche,
        pms: [inputObj.pms],
        };
        acc.set(inputObj.id, newObj);
      }
      return acc;
  }

  async createBilanTestDomainisationDto(inputObj: ProjetDomainise) {
    var pms = await searchPms(inputObj.objet_marche, 6);
    //var objTokens = await getTokens("projet_domainises", inputObj.objet_marche);
    // var tabTokens= [];
    // for (let t of objTokens.data.tokens) {
    //   tabTokens.push(t.token);
    // }
    console.log(pms.flat(1).slice(0,3));
    const newObj: BilanTestDomainisationDto = {
      imId: inputObj.id,
      objet_marche: inputObj.objet_marche,
      pmsProduits: affichage(inputObj.pms.sort()),
      domaines: affichage(pms.flat(1).slice(0,2).sort()),
      //egal: JSON.stringify(pms.flat(1).slice(0,2))===JSON.stringify(inputObj.pms)?true:false,
      egal: egal(pms.flat(1).slice(0,2), inputObj.pms),
      include: include(pms.flat(1).slice(0,2), inputObj.pms),
      //tokens: JSON.stringify(tabTokens),
      tokens: '',
      new: inputObj.date_modification<new Date('2021-01-01T01:32:00')?true:false
    };
    //console.log(newObj);
    return newObj;
  }

  generateXlsxFromArrayBilanTestDomainisationDto(b: BilanTestDomainisationDto[], nom: string) {
    const http = require('http');
    var XLSX = require("xlsx");
    const workbook = readFile("template.xlsx", {
      cellStyles: true,
      cellHTML: false,
      cellText: false,
    });
    let dataSheet = workbook.Sheets.data;
    let bilanSheet = workbook.Sheets.Bilan;
    const range = XLSX.utils.decode_range(dataSheet["!ref"] ?? "");
    console.log(range);
    XLSX.utils.encode_cell(range);
    var arr = new Array(b.length);
    for (var i = 0; i < b.length; i++) {
      arr[i] = new Array(8);
      arr[i] = Object.values(b[i]);
    }
    XLSX.utils.sheet_add_aoa(dataSheet, arr, { origin: "A2" });
    var date = new Date();
    XLSX.utils.sheet_add_aoa(bilanSheet, [[nom]] , { origin: "B2" });
    XLSX.utils.sheet_add_aoa(bilanSheet, [[calculPourcentage(b.map( e => {return e.egal;}),b.length)]], { origin: "B4" });
    XLSX.utils.sheet_add_aoa(bilanSheet, [[calculPourcentage(b.map( e => {return e.include;}),b.length)]], { origin: "B5" });
    XLSX.utils.sheet_add_aoa(bilanSheet, [[date]], { origin: "B3" });
    const nameSheet: string = `${format(date)}.xlsx`;
    console.log(nameSheet);
    // const buff = XLSX.writeFileXLSX(workbook, nameSheet, {
    //   cellStyles: true,
    //   cellHTML: false,
    //   cellText: false,
    //   type:"buffer",
    //   bookType:"xlsx"
    // });
    
    const server = http.createServer((req, res) => {
      const buf = XLSX.write(workbook, { type:"buffer", bookType:"xlsx" });
      res.statusCode = 200;
      res.setHeader('Content-Disposition', `attachment; filename="${nameSheet}"`);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.end(buf);
    });

    server.listen(7262, '127.0.0.1', () => {
      console.log(`Server running at http://${'127.0.0.1'}:${7262}/`);
    });

  }

  search(keywords: string) {
    return elasticsearchService.search("projet_domainises",keywords);
  }

  searchDomaine(keywords: string) {
    return elasticsearchService.search("projet_domainises",keywords).then(hits => { return hits.hits.map((hit: any) => hit._source) });
  }

  getHello(): string {
    return 'Hello World!';
  }
}

export function searchPms(keywords: string, minHitsScore: number) {
  return elasticsearchService.search("projet_domainises",keywords).then(hits => { return hits.hits.filter(h => h._score>minHitsScore).map((hit: any) => hit._source.pms) });
}

export function getTokens(indexName: string, textContent: string) {
  return elasticsearchService.getTokens(indexName, textContent);
}

export function calculPourcentage(tab: boolean[], total: number): number {
  return tab.filter(x => x===true).length/total;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function affichage(tabString: String[]) {
  let setString = new Set(tabString);
  let affich:string = ''
  setString.forEach(e => {
    affich=affich+e+','
   });
   return affich.slice(0, -1);
}

export function egal(a: String[], b: String[]) {
  const [set1, set2] = [new Set(a), new Set(b)];
  const common = [...set1].filter(x => set2.has(x));
  return (set1.size===set2.size) && (set1.size===common.length);
}

export function include(a: String[], b: String[]) {
  const [set1, set2] = [new Set(a), new Set(b)];
  const common = [...set1].filter(x => set2.has(x));
  return (set2.size===common.length);
}

export function format(inputDate) {
  let date, month, year, hour, minute, second;

  date = inputDate.getDate();
  month = inputDate.getMonth() + 1;
  year = inputDate.getFullYear();
  hour = inputDate.getHours();
  minute = inputDate.getMinutes();
  second = inputDate.getSeconds();

    date = date
        .toString()
        .padStart(2, '0');

    month = month
        .toString()
        .padStart(2, '0');

    hour = hour
        .toString()
        .padStart(2, '0');

    minute = minute
        .toString()
        .padStart(2, '0');

    second = second
        .toString()
        .padStart(2, '0');

  return `${date}-${month}-${year}-${hour}-${minute}-${second}`;
}
