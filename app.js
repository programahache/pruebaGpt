const openai = require('openai');
const twilio = require('twilio');
const express = require('express');
const bodyParser = require('body-parser');

openai.apiKey = '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';
const twilioClient = twilio('AC2b19e0e7b7ce603a7007ae7d589e568d', '3db38a93aa3c7d0e36d0728c35f1ab73');

const surveyQuestions = [/* 18 preguntas de la encuesta de MIA aquí */];

// Objeto de estado del usuario para almacenar el índice de la pregunta actual y las respuestas
const userState = {
    currentQuestionIndex: 0,
    answers: {},
};

// Función para obtener respuesta de GPT-3
async function getGpt3Response(prompt) {
    const response = await openai.Completion.create({
        engine: 'davinci-codex',
        prompt: prompt,
        max_tokens: 100,
        n: 1,
        stop: null,
        temperature: 0.5,
    });

    return response.choices[0].text.trim();
}

// Función para obtener la siguiente pregunta de GPT-3 basada en el índice proporcionado
async function getNextQuestion(questionIndex) {
    const prompt = `Haz la siguiente pregunta de la encuesta: '${surveyQuestions[questionIndex]}'`;
    return await getGpt3Response(prompt);
}

// Función para extraer la respuesta específica de la respuesta del usuario
function extractAnswer(questionIndex, userAnswer) {
    const question = surveyQuestions[questionIndex];
    const answerOptions = question.match(/\|?[^|]+/g) || [];
    const answerIndex = answerOptions.findIndex((option) => userAnswer.trim().toLowerCase() === option.trim().toLowerCase());
    return answerIndex !== -1 ? answerOptions[answerIndex].trim() : userAnswer.trim();
}

// Función para procesar la respuesta del usuario
async function processUserAnswer(userAnswer) {
    const extractedAnswer = extractAnswer(userState.currentQuestionIndex, userAnswer);
    userState.answers[surveyQuestions[userState.currentQuestionIndex]] = extractedAnswer;

    if (userState.currentQuestionIndex < surveyQuestions.length - 1) {
        userState.currentQuestionIndex++;
    } else {
        // Guardar las respuestas del usuario y reiniciar el estado
        console.log('Respuestas del usuario:', userState.answers);
        userState.currentQuestionIndex = 0;
        userState.answers = {};
    }
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Ruta para recibir mensajes entrantes
app.post('/incoming', async (req, res) => {
    const userMessage = req.body.Body;
    const fromPhoneNumber = req.body.From;

    // Procesar la respuesta del usuario
    await processUserAnswer(userMessage);

    // Obtener la siguiente pregunta y enviarla al usuario
    const nextQuestion = await getNextQuestion(userState.currentQuestionIndex);
    twilioClient.messages.create({
        from: 'whatsapp:tu-número-de-whatsapp-twilio',
        to: fromPhoneNumber,
        body: nextQuestion,
    });

    res.status(204).send();
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => console.log('Servidor escuchando en el Juan Gutierrez continua puerto 3000'));
