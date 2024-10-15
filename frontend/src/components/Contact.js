import React from 'react';
import { useParams, } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
    const { phone } = useParams();
    const navigate = useNavigate();

    return (
        <div>
            <h2>Contact: {phone}</h2>
            <button onClick={() => navigate(`/chat/${phone}`)}>Chat</button>
            <button onClick={() => navigate(`/video-call/${phone}`)}>Video Call</button>
        </div>
    );
};

export default Contact;
