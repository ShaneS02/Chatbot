"use client"
import Image from "next/image"
import GPTLogo from "./assets/GPTLogo.png"
import { useChat } from '@ai-sdk/react'
import { useState } from 'react';
//import { Message } from "ai"

const Home = () => {
    const { messages, sendMessage, status } = useChat()
    const [input, setInput] = useState('');

    const noMessages = true

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


    return (
        <main>
            <Image src={GPTLogo} width="250" alt="GPT Logo" />
            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            Ask about anyything related to animals and the chatbot
                            will respond as accurately as possible. Enjoy!
                        </p><br />
                        {/*<promptSuggestionRow/>*/}
                    </>
                ) : (
                    <>
                        {/*map messages to text bubbles*/}
                        {/*<LoadingBubble/>*/}
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