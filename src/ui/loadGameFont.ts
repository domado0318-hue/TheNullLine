/** Canvas 텍스트가 대체 글꼴로 굳지 않도록 첫 Scene 생성 전에 로드한다. */
export async function loadGameFont(fonts: Pick<FontFaceSet, 'load'> = document.fonts): Promise<void> {
  try {
    await fonts.load('16px "Yangjin"');
  } catch (error) {
    console.warn('양진체를 불러오지 못해 기본 글꼴로 게임을 시작합니다.', error);
  }
}
