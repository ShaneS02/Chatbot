"use client"
import Image from "next/image"
import GPTLogo from "./assets/GPTLogo.png"
import { useChat } from '@ai-sdk/react'
import { useState } from 'react';
import { UIMessage } from "ai"

import PromptSuggestionRow from "./components/PromptSuggestionRow";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";


const Home = () => {
    const { messages, sendMessage, setMessages, status } = useChat()
    const [input, setInput] = useState('');

    const noMessages = !messages || messages.length === 0
    const isLoading = status === 'submitted' || status === 'streaming';

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // prevent default form submit
        if (input.trim()) {
            sendMessage({ text: input }); // your existing logic
            setInput(''); // clear input
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };


    const handlePrompt = (promptText) => {
        const msg: UIMessage = {
            id: crypto.randomUUID(),
            parts: [{ type: "text", text: promptText }],
            role: "user"
        }
        setMessages([...messages, msg]); //add a new message
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