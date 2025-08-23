"use client"
import Image from "next/image"
import GPTLogo from "./assets/GPTLogo.png"
import { useState } from 'react';

import PromptSuggestionRow from "./components/PromptSuggestionRow";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";


const Home = () => {
    type ChatMessage = {
        role: "user" | "assistant" | "system";
        content: string;
    };

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const noMessages = !messages || messages.length === 0
    //const isLoading = status === 'submitted' || status === 'streaming';

    const sendMessage = async (text) => {
        setIsLoading(true); // start loading
        // Append user's message locally
        const userMessage: ChatMessage = { role: "user", content: text };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        setInput(""); // clear input
        try {
            // Send messages to your API route
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages }),
            });


            //receive messages
            const data = await res.json();
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.message,
            };
            setMessages([...newMessages, assistantMessage]);

        } finally {
            setIsLoading(false); // done loading
        }
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // prevent page reload
        sendMessage(input);      // call your existing sendMessage function
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };


    const handlePrompt = (promptText) => {
        sendMessage(promptText);
    }

    return (
        <main>
            <Image src={GPTLogo} width="250" alt="GPT Logo" />
            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            Ask about anyything related to animals and the chatbot
                            will respond as accurately as possible. Enjoy!
                        </p>
                        <br />
                        <PromptSuggestionRow onPromptClick={handlePrompt} />

                    </>

                ) : (
                    <>
                        {messages.map((message, index) => <Bubble key={`message-${index}`} message={message} />)}
                        {isLoading && <LoadingBubble />}
                    </>
                )}

            </section>
            <form onSubmit={handleSubmit}>
                <input className="question-box" onChange={handleInputChange} value={input} placeholder="Ask me something..." />
                <input type="submit" />

            </form>
        </main >
    )
}

export default Home