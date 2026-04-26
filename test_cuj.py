import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("file:///app/index.html")
    page.wait_for_timeout(500)

    # Check what buttons are there, or evaluate directly
    page.evaluate('''
      const file = new File(['%PDF-1.4 mock content'], 'mock.pdf', { type: 'application/pdf' });
      const item = criarItemLista(file.name);
      setProgresso(item, 50, false, false);
      setStatus(item, 'processando', 'Processando mock...');

      // we need to unhide the list
      document.getElementById('lista-arquivos').classList.remove('oculto');
    ''')
    page.wait_for_timeout(1000)

    progress_wrap = page.locator('.progresso-wrap').first
    assert progress_wrap.get_attribute('role') == 'progressbar', "Expected role='progressbar'"
    assert progress_wrap.get_attribute('aria-valuemin') == '0', "Expected aria-valuemin='0'"
    assert progress_wrap.get_attribute('aria-valuemax') == '100', "Expected aria-valuemax='100'"
    assert progress_wrap.get_attribute('aria-valuenow') == '50', "Expected aria-valuenow='50'"

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except AssertionError as e:
            print(e)
            sys.exit(1)
        finally:
            context.close()
            browser.close()
