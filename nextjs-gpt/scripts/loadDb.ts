import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { InferenceClient } from "@huggingface/inference";

import "dotenv/config" //allows us to access values in the .env file 
import { SimilarityMetric } from "@langchain/community/vectorstores/rockset";

type similarityMetric = "dot_product" | "cosine" | "euclidean"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOCKET,
    HUGGINGFACE_API_KEY
} = process.env

const huggingface = new InferenceClient(HUGGINGFACE_API_KEY)
const embeddingModel = 'sentence-transformers/all-Mpnet-base-v2';

const data = [
    'https://en.wikipedia.org/wiki/List_of_animal_names',
    'https://en.wikipedia.org/wiki/List_of_mammals_of_Africa',
    'https://en.wikipedia.org/wiki/List_of_domesticated_animals',
    'https://en.wikipedia.org/wiki/List_of_largest_organisms',
    'https://en.wikipedia.org/wiki/List_of_longest-living_organisms',
    'https://en.wikipedia.org/wiki/List_of_mammals_of_Canada',
    'https://en.wikipedia.org/wiki/List_of_mammals_of_Australia',
    'https://en.wikipedia.org/wiki/List_of_birds_of_India',
    'https://en.wikipedia.org/wiki/List_of_reptiles_of_South_Africa',
    'https://en.wikipedia.org/wiki/List_of_mammals_of_the_United_States',
    'https://en.wikipedia.org/wiki/List_of_birds_of_the_United_States',
    'https://en.wikipedia.org/wiki/List_of_mammals_of_Asia'
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOCKET)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
})

const createCollection = async (SimilarityMetric: similarityMetric = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 768, //this is for the huggingface model sentence-transformers/all-Mpnet-base-v2. If too slow, can swap to sentence-transformers/all-MiniLM-L12-v2 (dimensions: 384)
            metric: SimilarityMetric
        }
    })
    console.log(res) // output response
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)

    for await (const url of data) {
        const content = await scrapePage(url)
        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks) {
            const vector = await huggingface.featureExtraction({
                model: embeddingModel,
                inputs: chunk,
            });

            const res = await collection.insertOne({
                $vector: vector,
                text: chunk
            })
        }
    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true //Note: check this if there is an issue
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML)
            await browser.close()
            return result
        }


    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, '') //only interested in the text. Remove tags
}

createCollection().then(() => loadSampleData())