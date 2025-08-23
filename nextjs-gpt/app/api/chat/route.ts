import { InferenceClient } from "@huggingface/inference";
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

type ChatCompletionStreamOutput = {
    delta?: {
        role?: "assistant" | "user" | "system";
        content?: string;
    };
};

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
        const latestMessage = messages[messages?.length - 1]?.content
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
            content: `You are an AI assistant for animals. You may use the following context 
                        to help answer questions, but you do not need to mention it explicitly. 
                        Answer naturally and directly. do not start answers with "According to the provided context". 
                        Use context silently if it helps. If listing multiple items or points, use bullet points (-) 
                        or numbered lists (1., 2., 3.). Don't return images.   
        
        ------------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ------------------
        QUESTION: ${latestMessage}
        ------------------
        `

        }

        const systemMessage = {
            role: "system",
            content: "You are an AI assistant for animals. Answer questions clearly, using markdown. Do not mention sources or generate images."
        };

        const contextMessage = {
            role: "user",
            content: `Here is the relevant context from Wikipedia:\n${docContext}\n\nQuestion: ${latestMessage}`
        };

        const response = await huggingface.chatCompletion({
            model: "meta-llama/Llama-3.1-8B-Instruct",
            messages: [template, ...messages],
            max_tokens: 100
        });

        const assistantMessage = response.choices[0].message.content;
        console.log(assistantMessage); // should print a string


        return new Response(JSON.stringify({ message: assistantMessage }), {
            headers: { "Content-Type": "application/json" },
        });

        /*
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
            */

    } catch (err) {
        throw err
    }
}