import { InferenceClient } from "@huggingface/inference";
import { streamText } from "ai"
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOCKET,
    HUGGINGFACE_API_KEY
} = process.env

const huggingface = new InferenceClient(HUGGINGFACE_API_KEY)
const embeddingModel = 'sentence-transformers/all-Mpnet-base-v2';

const dbClient = new DataAPIClient(ASTRA_DB_APPLICATION_TOCKET)
const db = dbClient.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

function meanPool(matrix: number[][]): number[] {
    const length = matrix.length;
    const dim = matrix[0].length;
    const result = new Array(dim).fill(0);

    for (const row of matrix) {
        row.forEach((val, i) => {
            result[i] += val;
        });
    }

    return result.map(v => v / length);
}


export async function POST(req: Request) {
    try {
        const { messages } = await req.json()
        const latestMessage = messages[messages?.length - 1]?.parts[0].text
        let docContext = ""


        const rawEmbedding = await huggingface.featureExtraction({
            model: embeddingModel,
            inputs: latestMessage,
            encoding_format: "float"
        })




        let embedding: number[];
        if (Array.isArray(rawEmbedding[0])) {
            // token-level embeddings → mean pool
            embedding = meanPool(rawEmbedding as number[][]);
        } else {
            // already sentence-level
            embedding = rawEmbedding as number[];
        }


        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION)
            const cursor = collection.find(null, {
                sort: {
                    $vector: embedding
                },
                limit: 10
            })

            const documents = await cursor.toArray()
            const docsMap = documents?.map(doc => doc.text)

            docContext = JSON.stringify(docsMap)


        } catch (err) {
            console.log("Error querying db...")
            docContext = ""
        }


        const template = {
            role: "system",
            content: `you are an AI assistant for animals. Use the below context
        to augument what you know about animals. The context will provode information from 
        wikipedia. Of the context doesn't include the information needed, answer based on
        your own knowledge and don't mention the source of your information. Format responses
        using maarkdown where applicable and don't return images.
        
        ------------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ------------------
        QUESTION: ${latestMessage}
        ------------------
        `

        }

        const stream = await huggingface.chatCompletionStream({
            model: "meta-llama/Meta-Llama-3-8B-Instruct",
            messages: [template, ...messages],
            stream: true,
            max_tokens: 100
        })

        const readableStream = new ReadableStream({
            async start(controller) {
                for await (const event of stream) {
                    if (event.type === "message") {
                        const chunk = new TextEncoder().encode(event.delta as string);
                        controller.enqueue(chunk);
                    }
                }
                controller.close();
            }
        });

        // Return streaming response
        return new Response(readableStream, {
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });

    } catch (err) {
        throw err
    }
}