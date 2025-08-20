const Bubble = ({ message }) => {
    const { parts, role } = message
    const content = parts[0].text
    return (
        <div className={`${role} bubble`}>{content}</div>
    )
}

export default Bubble