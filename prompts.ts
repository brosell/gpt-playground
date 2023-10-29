export default {
  COULD_ANSWER: `
  Can you reply to “{{question}}” considering the following selection of text? If not, reply 'FALSE' followed by an explanation of why you couldn't answer. If yes, reply 'TRUE' followed by the answer. Here is the selection: “{{chunk}}”
  `,
  ANSWER: `
  Using only this selection of text for reference
  """
  {{chunk}}
  """

  answer this question:
  """
  {{question}}
  """
  
  The response should be markdown format. 
  A header should be how the text relates to the question. 
  The response should be in paragraph form, less than 125 words.
  
  Do not reference the selection of text directly; instead summarize the ideas.
  add another section with a short bullet list of key concepts with no explanation
  `

};