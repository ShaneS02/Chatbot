import "./global.css"

export const metadata = {
    title: "GPT",
    description: "RAG chatbot about animals"
}

const RootLayout = ({ children }) => {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}

export default RootLayout