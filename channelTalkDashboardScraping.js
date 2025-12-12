(function () {
	const targetXPath =
		'//*[@id="main"]/div/div/div/div[1]/div/div/div/div/div/div[2]/div[1]/div[2]/div/div[1]/div[2]/div[1]/div/div/div/div/div[4]/div[2]/div[3]/div[1]/div[3]';

	const observer = new MutationObserver(() => {
		const el = document.evaluate(
			targetXPath,
			document,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue;

		if (el && !document.getElementById('copy-btn')) {
			const copyBtn = document.createElement('button');
			copyBtn.innerHTML =
				"<div class='b-k-5l5'><span class='b-Dt6vY b--iMho b-nAMDB b-K-KC5 b-yjqfZ'>복사안해줄건데?</span></div>";
			copyBtn.style.marginLeft = '6px';
			copyBtn.className = 'b-1oeNI b-r4Bne b-qdkXf b-q7Rq7 b-zQNHH';
			copyBtn.setAttribute('data-bezier-component', 'Button');
			copyBtn.id = 'copy-btn';
			copyBtn.type = 'button';
			el.appendChild(copyBtn);
			observer.disconnect();

			copyBtn.addEventListener('click', async () => {
				try {
					const svgParent = document.evaluate(
						'//*[@id="main"]/div/div/div/div[1]/div/div/div/div/div/div[2]/div[1]/div[2]/div/div[1]/div[2]/div[1]/div/div/div/div/div[4]/div[2]/div[3]/div[2]/div/div[2]/div/div',
						
						document,
						null,
						XPathResult.FIRST_ORDERED_NODE_TYPE,
						null
					).singleNodeValue;

					if (!svgParent) {
						showToast('부모 div를 찾을 수 없어요.', 'error');
						return;
					}
					const svg = svgParent.querySelector('svg');
					if (!svg) {
						showToast('SVG를 찾을 수 없어요.', 'error');
						return;
					}

					// 1단계: HeatMapCountText 클래스를 가진 text 요소만 추출
					let textElements = Array.from(svg.querySelectorAll('text'))
						.filter((t) => {
							const className = t.getAttribute('class') || '';
							return (
								className.includes('HeatMapCountText') &&
								/^[0-9]+$/.test(t.textContent.trim())
							);
						})
						.map((t) => ({
							x: parseFloat(t.getAttribute('x')),
							y: parseFloat(t.getAttribute('y')),
							value: t.textContent.trim(),
						}))
						.filter((t) => !isNaN(t.x) && !isNaN(t.y));

					if (!textElements.length) {
						showToast('데이터 텍스트를 찾을 수 없어요.', 'error');
						return;
					}

					// 2단계: y 좌표 분석 - 최소값과 고정 간격 사용 (해상도 대응)
					const allY = textElements.map((t) => t.y);
					const minY = Math.min(...allY);
					const yGap = 34.5; // 요일 간 고정 간격

					// y 좌표를 요일 인덱스로 매핑 (해상도에 관계없이 동작)
					// minY = 일요일, minY + 34.5 = 월요일, minY + 69 = 화요일, ...
					const yToDayIndex = (y) => {
						for (let i = 0; i < 7; i++) {
							const expectedY = minY + yGap * i;
							if (Math.abs(y - expectedY) < 10) return i;
						}
						return -1;
					};

					// 3단계: x 좌표 분석 - 시작점과 간격 찾기
					const allX = [...new Set(textElements.map((t) => t.x))].sort(
						(a, b) => a - b
					);
					const startX = allX[0];

					// 간격 계산 (인접한 x 좌표들의 평균 간격)
					const gaps = [];
					for (let i = 0; i < allX.length - 1; i++) {
						const gap = allX[i + 1] - allX[i];
						if (gap < 55) {
							// 정상 간격만 (큰 갭은 누락된 시간대)
							gaps.push(gap);
						}
					}
					const avgXGap =
						gaps.length > 0
							? gaps.reduce((a, b) => a + b) / gaps.length
							: 48.826;

					// 4단계: 24시간 전체 데이터 생성 (고정 간격 사용)
					const full24Hours = [];
					for (let h = 0; h < 24; h++) {
						const expectedX = startX + avgXGap * h;

						// 해당 시간대의 데이터 찾기
						const dataAtHour = textElements.filter(
							(t) => Math.abs(t.x - expectedX) < 25
						);

						// 7개 요일 배열 초기화 [일, 월, 화, 수, 목, 금, 토]
						const weekData = ['0', '0', '0', '0', '0', '0', '0'];

						dataAtHour.forEach((item) => {
							const dayIdx = yToDayIndex(item.y);
							if (dayIdx !== -1 && dayIdx < 7) {
								weekData[dayIdx] = item.value;
							}
						});

						full24Hours.push(weekData);
					}

					// 5단계: Transpose - 요일별로 24시간 데이터를 한 행으로
					const result = [];
					for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
						const row = [];
						for (let h = 0; h < 24; h++) {
							row.push(full24Hours[h][dayIdx]);
						}
						result.push(row);
					}

					// 6단계: 탭으로 구분된 텍스트 생성
					const finalText = result.map((row) => row.join('\t')).join('\n');

					await navigator.clipboard.writeText(finalText);
					showToast('복사가 완료되었어요.', 'success');
				} catch (err) {
					console.error(err);
					showToast('복사 중 오류 발생: ' + err.message, 'error');
				}
			});
		}
	});

	// 토스트 알럿
	function showToast(message, type = 'success') {
		const existing = document.getElementById('custom-copy-toast');
		if (existing) existing.remove();

		const toast = document.createElement('div');
		toast.id = 'custom-copy-toast';
		toast.style.cssText = `
			position: fixed;
			top: 40px;
			left: 50%;
			transform: translateX(-50%) translateY(-20px);
			z-index: 999999;
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 12px 20px;
			background: #ffffff;
			border-radius: 12px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			font-size: 15px;
			font-weight: 600;
			color: #333d4b;
			opacity: 0;
			transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			pointer-events: none;
			max-width: 410px;
			`;

		const icon = document.createElement('span');
		icon.style.cssText = `
			width: 24px;
			height: 24px;
			min-width: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			`;

		if (type === 'success') {
			icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
          <circle cx="72" cy="72" r="66" fill="#15c07e"/>
          <path d="M45 70.055l20.496 20.496 33.504-33.504" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="12"/>
        </svg>
      `;
		} else {
			icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
          <circle cx="72" cy="72" r="66" fill="#ff5a5f"/>
          <path d="M55 55l34 34M89 55l-34 34" stroke="#fff" stroke-linecap="round" stroke-width="12"/>
        </svg>
      `;
		}

		const text = document.createElement('span');
		text.textContent = message;

		toast.appendChild(icon);
		toast.appendChild(text);
		document.body.appendChild(toast);

		requestAnimationFrame(() => {
			toast.style.opacity = '1';
			toast.style.transform = 'translateX(-50%) translateY(0)';
		});

		setTimeout(() => {
			toast.style.opacity = '0';
			toast.style.transform = 'translateX(-50%) translateY(-20px)';
			setTimeout(() => toast.remove(), 300);
		}, 3000);
	}

	observer.observe(document.body, { childList: true, subtree: true });

})();
