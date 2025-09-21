import React from 'react';

const GoogleMap = () => {
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden shadow-sm">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3838.8333333333335!2d-47.8822!3d-15.7942!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTXCsDQ3JzM5LjEiUyA0N8KwNTInNTUuOSJX!5e0!3m2!1spt-BR!2sbr!4v1234567890123"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen={true}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Localização SUPERNET FIBRA - Setor de Industria Gráfica (SIG), 25, Brasília, DF"
      />
    </div>
  );
};

export default GoogleMap;