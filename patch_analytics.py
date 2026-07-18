import os
import streamlit as st

streamlit_static_path = os.path.join(os.path.dirname(st.__file__), 'static', 'index.html')

if os.path.exists(streamlit_static_path):
    with open(streamlit_static_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    ga_snippet = """
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JKK2M439E9"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-JKK2M439E9');
    </script>
    
    <!-- LinkedIn/Open Graph Preview Customization -->
    <meta property="og:title" content="KeelEngine — London Transit & Rental Cost Optimizer" />
    <meta property="og:description" content="A lightweight Python application built to instantly map door-to-door TfL commutes and local council tax boundaries against your housing budget." />
    <meta property="og:type" content="website" />
    """

    if "G-JKK2M439E9" not in html_content:
        updated_html = html_content.replace("</head>", f"{ga_snippet}\n</head>")
        with open(streamlit_static_path, 'w', encoding='utf-8') as f:
            f.write(updated_html)
        print("✅ Google Analytics successfully injected into Streamlit core HTML.")
    else:
        print("ℹ️ Google Analytics tag already present.")
else:
    print("❌ Streamlit static index.html path could not be resolved.")