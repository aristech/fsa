'use strict';

class GdprProperties{
    constructor(builder){
        this.gdpr_compliant = builder.gdpr_compliant;
        this.title = builder.title;
        this.description = builder.description;
        this.legal_text = builder.legal_text;
    }
}

class GdprPropertiesBuilder{
    gdpr_compliant = null;
    title = null;
    description = null;
    legal_text = null;
    constructor(gdpr){
        if (gdpr !== undefined) {
            if (gdpr === null)
                return;
            if (typeof gdpr === "boolean") {
                this.gdpr_compliant = gdpr;
            } else {
                this.gdpr_compliant = gdpr.gdpr_compliant;
                this.title = gdpr.title;
                this.description = gdpr.description;
                this.legal_text = gdpr.legal_text;
            }
        }
    };
    getBuilderFromGdprProperties(gdprProperties){
        return new GdprPropertiesBuilder(gdprProperties)
    }
    getGdprPropertiesBuilder(gdprCompliant) {
        //check that the values exist

        return new GdprPropertiesBuilder(gdprCompliant)
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
    setLegalText(legalText) {
        this.legal_text = legalText;
        return this;
    }
    build() {
        return new GdprProperties(this);
    }
}
module.exports = {
    GdprProperties,
    GdprPropertiesBuilder
};