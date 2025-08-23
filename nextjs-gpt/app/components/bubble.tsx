const Bubble = ({ message }) => {
    const { role, content } = message

    return (
        <div className={`${role} bubble`}>{content}</div>
    )
}

export default Bubble