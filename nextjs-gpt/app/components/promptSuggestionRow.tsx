import PromptSuggestionButton from "./PromptSuggestionButton"

const PromptSuggestionRow = ({ onPromptClick }) => {
    const prompts = [
        "How many mamals are in America",
        "What animal is the largest?",
        "Who is the fastest animal?",
        "What are the different names of bird species."
    ]

    return (
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) =>
                <PromptSuggestionButton
                    key={`suggestion-${index}`}
                    text={prompt}
                    onClick={(() => onPromptClick(prompt))}
                />
            )}
        </div>
    )
}

export default PromptSuggestionRow